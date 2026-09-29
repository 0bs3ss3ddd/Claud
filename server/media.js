// Картинки для наставника: заглавная иллюстрация статьи Википедии (картины, карты, портреты).
// Адрес запроса фиксирован (ru/en.wikipedia.org), ответ фильтруется: наружу уходят только
// ссылки на upload.wikimedia.org и страницы самой Википедии.
const TTL_OK = 7 * 24 * 60 * 60 * 1000;
const TTL_FAIL = 10 * 60 * 1000;
const CACHE_MAX_ROWS = 5000;
const LANGS = new Set(['ru', 'en']);

export function cleanTitle(raw) {
  if (typeof raw !== 'string') return null;
  const t = raw.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  if (!t || t.length > 200 || /[#<>[\]{}|\\]/.test(t) || /^[.\s]+$/.test(t)) return null;
  return t;
}

function safeImage(img) {
  if (!img || typeof img.source !== 'string') return null;
  if (!img.source.startsWith('https://upload.wikimedia.org/')) return null;
  return { src: img.source, width: Number(img.width) || null, height: Number(img.height) || null };
}

export function pickImage(summary) {
  const original = safeImage(summary?.originalimage);
  const thumb = safeImage(summary?.thumbnail);
  if (original && original.width && original.width <= 1400) return original;
  if (thumb) {
    // Заменяем ширину превью на 960px, если оригинал больше.
    if (original?.width > 960 && /\/\d+px-[^/]+$/.test(thumb.src)) {
      const ratio = original.height && original.width ? original.height / original.width : null;
      return { src: thumb.src.replace(/\/\d+px-([^/]+)$/, '/960px-$1'), width: 960, height: ratio ? Math.round(960 * ratio) : null };
    }
    return thumb;
  }
  return original;
}

/**
 * @param {Set<string>} publicTitles — иллюстрации из учебного контента: доступны всем.
 *   Остальные названия (например, из ответов ИИ) — только вошедшим пользователям.
 */
export function createMedia({ db, config, fetchImpl = fetch, publicTitles = new Set() }) {
  const get = db.prepare('SELECT json, fetched_at FROM media_cache WHERE key = ?');
  const put = db.prepare('INSERT OR REPLACE INTO media_cache (key, json, fetched_at) VALUES (?, ?, ?)');
  const prune = db.prepare(`DELETE FROM media_cache WHERE fetched_at < ? OR key IN (
    SELECT key FROM media_cache ORDER BY fetched_at DESC LIMIT -1 OFFSET ?)`);
  const pending = new Map();
  let writes = 0;

  function store(key, data) {
    put.run(key, JSON.stringify(data), Date.now());
    if (++writes % 100 === 0) prune.run(Date.now() - 30 * 24 * 60 * 60 * 1000, CACHE_MAX_ROWS);
  }

  function resolve(title, lang = 'ru') {
    const key = `wiki:${lang}:${title}`;
    if (pending.has(key)) return pending.get(key);
    const p = resolveUncached(key, title, lang).finally(() => pending.delete(key));
    pending.set(key, p);
    return p;
  }

  async function resolveUncached(key, title, lang) {
    const cached = get.get(key);
    if (cached) {
      const data = JSON.parse(cached.json);
      const ttl = data.ok ? TTL_OK : TTL_FAIL;
      if (Date.now() - cached.fetched_at < ttl) return data;
    }
    if (!config.media.enabled) return { ok: false, title };

    let data;
    try {
      const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}?redirect=true`;
      const r = await fetchImpl(url, {
        headers: { 'User-Agent': config.media.userAgent, Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
        redirect: 'follow',
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      if (r.url && !r.url.startsWith(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/`)) throw new Error('неожиданный редирект');
      const s = await r.json();
      const page = s?.content_urls?.desktop?.page;
      data = {
        ok: true,
        title: String(s.title ?? title).slice(0, 200),
        description: typeof s.description === 'string' ? s.description.slice(0, 300) : '',
        extract: typeof s.extract === 'string' ? s.extract.slice(0, 600) : '',
        image: pickImage(s),
        page: typeof page === 'string' && page.startsWith(`https://${lang}.wikipedia.org/`) ? page : null,
      };
    } catch {
      data = { ok: false, title };
    }
    store(key, data);
    return data;
  }

  return {
    resolve,
    async handle(req, res) {
      const title = cleanTitle(req.query.title);
      const lang = LANGS.has(req.query.lang) ? req.query.lang : 'ru';
      if (!title) return res.status(400).json({ error: 'Некорректное название' });
      if (!publicTitles.has(title) && !req.user) return res.status(401).json({ error: 'Нужно войти', reason: 'auth' });
      const data = await resolve(title, lang);
      res.set('Cache-Control', 'private, max-age=3600');
      res.json(data);
    },
  };
}
