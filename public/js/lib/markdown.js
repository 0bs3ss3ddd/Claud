// Безопасный рендер markdown-подмножества + KaTeX + визуальные директивы.
// Принцип: весь пользовательский/модельный текст сначала экранируется,
// разметка добавляется только поверх экранированного текста.
// Модуль чистый (без DOM), поэтому используется и в браузере, и в тестах Node.

const VIZ_TYPES = new Set(['graph', 'map', 'image', 'chart']);
const TOKEN_OPEN = '';
const TOKEN_CLOSE = '';
const TOKEN_RE = /(\d+)/g;
const MAX_SOURCE = 60000;

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderTex(katex, tex, displayMode) {
  if (!katex) {
    return `<code class="tex">${escapeHtml(tex)}</code>`;
  }
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: 'ignore',
      trust: false,
      maxSize: 20,
      maxExpand: 500,
    });
  } catch {
    return `<code class="tex">${escapeHtml(tex)}</code>`;
  }
}

/**
 * @returns {{ html: string, viz: Array<{type: string, data?: any, error?: string, pending?: boolean}> }}
 */
export function renderMarkdown(source, { katex = null } = {}) {
  let src = String(source ?? '').replace(/\r\n?/g, '\n');
  if (src.length > MAX_SOURCE) src = src.slice(0, MAX_SOURCE);
  // Защита от подмены служебных символов извне.
  src = src.replace(/[-]/g, '');

  const tokens = [];
  const viz = [];
  const addToken = (html) => `${TOKEN_OPEN}${tokens.push(html) - 1}${TOKEN_CLOSE}`;

  // 1. Блочные директивы :::type ... ::: и ограждённый код ```lang ... ```
  const lines = src.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dir = line.match(/^\s*:::\s*(graph|map|image|chart|code)\b\s*([\w+#-]*)\s*$/);
    const fence = line.match(/^\s*```\s*([\w+#-]*)\s*$/);
    if (!dir && !fence) { out.push(line); continue; }
    const closer = dir ? /^\s*:::\s*$/ : /^\s*```\s*$/;
    const body = [];
    let j = i + 1;
    while (j < lines.length && !closer.test(lines[j])) body.push(lines[j++]);
    const closed = j < lines.length;
    const type = dir ? dir[1] : 'code';
    const lang = dir ? dir[2] : fence[1];
    const text = body.join('\n');
    if (type === 'code') {
      const label = lang ? `<span class="code-lang">${escapeHtml(lang)}</span>` : '';
      out.push('', addToken(`<pre class="code">${label}<code>${escapeHtml(text)}</code></pre>`), '');
    } else if (!closed) {
      const idx = viz.push({ type, pending: true }) - 1;
      out.push('', addToken(`<div class="viz viz--pending" data-viz="${idx}"></div>`), '');
    } else {
      let data = null;
      let error = null;
      try {
        data = JSON.parse(text);
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('ожидался объект');
      } catch (e) {
        error = `Не удалось прочитать блок «${type}»: ${e.message}`;
      }
      const idx = viz.push(error ? { type, error } : { type, data }) - 1;
      out.push('', addToken(`<div class="viz viz--${type}" data-viz="${idx}"></div>`), '');
    }
    i = closed ? j : lines.length;
  }
  let text = out.join('\n');

  // 2. Формулы: сначала $$...$$, затем $...$
  text = text.replace(/\\\$/g, () => addToken('$'));
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => addToken(renderTex(katex, tex.trim(), true)));
  text = text.replace(/\$([^$\n]+?)\$/g, (_, tex) => addToken(renderTex(katex, tex.trim(), false)));

  // 3. Инлайн-код
  text = text.replace(/`([^`\n]+)`/g, (_, code) => addToken(`<code>${escapeHtml(code)}</code>`));

  // 4. Экранирование всего остального
  text = escapeHtml(text);

  // 5. Блочная разметка
  const html = renderBlocks(text.split('\n'));

  // 6. Возврат токенов (токены могут быть вложены — раскрываем до конца)
  let result = html;
  for (let k = 0; k < 3 && TOKEN_RE.test(result); k++) {
    TOKEN_RE.lastIndex = 0;
    result = result.replace(TOKEN_RE, (_, n) => tokens[Number(n)] ?? '');
  }
  TOKEN_RE.lastIndex = 0;
  return { html: result, viz };
}

function inline(s) {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*(?!\s)([^*\n]+?)\*(?!\w)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/(?!\/))[^\s()]+)\)/g, (_, label, url) => {
      const external = /^https?:/.test(url);
      return external
        ? `<a href="${url}" target="_blank" rel="noopener noreferrer nofollow">${label}</a>`
        : `<a href="${url}" data-link>${label}</a>`;
    });
}

const RE_UL = /^(\s*)[-*•]\s+(.*)$/;
const RE_OL = /^(\s*)(\d+)[.)]\s+(.*)$/;
const RE_BLOCK_TOKEN = /^\d+$/;

function renderBlocks(lines) {
  const html = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) { i++; continue; }

    if (RE_BLOCK_TOKEN.test(trimmed)) { html.push(trimmed); i++; continue; }

    const h = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = Math.min(h[1].length + 2, 6);
      html.push(`<h${level}>${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(trimmed)) { html.push('<hr>'); i++; continue; }

    if (trimmed.startsWith('&gt;')) {
      const quote = [];
      while (i < lines.length && lines[i].trim().startsWith('&gt;')) {
        quote.push(lines[i].trim().replace(/^&gt;\s?/, ''));
        i++;
      }
      html.push(`<blockquote>${renderBlocks(quote)}</blockquote>`);
      continue;
    }

    if (trimmed.startsWith('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      const rows = [];
      rows.push(splitRow(trimmed));
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(splitRow(lines[i].trim())), i++;
      const [head, ...body] = rows;
      html.push(
        '<div class="table-wrap"><table><thead><tr>' +
          head.map((c) => `<th>${inline(c)}</th>`).join('') +
          '</tr></thead><tbody>' +
          body.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') +
          '</tbody></table></div>',
      );
      continue;
    }

    if (RE_UL.test(line) || RE_OL.test(line)) {
      const items = [];
      while (i < lines.length && (RE_UL.test(lines[i]) || RE_OL.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
        const l = lines[i];
        const ul = l.match(RE_UL);
        const ol = ul ? null : l.match(RE_OL);
        if (ul) {
          items.push({ indent: ul[1].length, ordered: false, text: ul[2] });
        } else if (ol) {
          items.push({ indent: ol[1].length, ordered: true, start: Number(ol[2]), text: ol[3] });
        } else {
          items[items.length - 1].text += '<br>' + l.trim();
        }
        i++;
      }
      html.push(renderList(items, 0, items.length));
      continue;
    }

    const para = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i], lines[i + 1])) {
      para.push(lines[i].trim());
      i++;
    }
    if (para.length === 0) { para.push(trimmed); i++; }
    html.push(`<p>${inline(para.join('<br>'))}</p>`);
  }
  return html.join('\n');
}

function isBlockStart(line, next) {
  const t = line.trim();
  return (
    RE_BLOCK_TOKEN.test(t) ||
    /^#{1,4}\s/.test(t) ||
    /^(-{3,}|\*{3,})$/.test(t) ||
    t.startsWith('&gt;') ||
    RE_UL.test(line) ||
    RE_OL.test(line) ||
    (t.startsWith('|') && next !== undefined && /^\s*\|?[\s:|-]+\|?\s*$/.test(next) && next.includes('-'))
  );
}

function splitRow(row) {
  return row.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

function renderList(items, start, end) {
  if (start >= end) return '';
  const base = items[start].indent;
  const tag = items[start].ordered ? 'ol' : 'ul';
  const first = items[start].start;
  let html = tag === 'ol' && first > 1 && first < 1000 ? `<ol start="${first}">` : `<${tag}>`;
  let i = start;
  while (i < end) {
    const item = items[i];
    let j = i + 1;
    while (j < end && items[j].indent > base) j++;
    html += `<li>${inline(item.text)}${j > i + 1 ? renderList(items, i + 1, j) : ''}</li>`;
    i = j;
  }
  return html + `</${tag}>`;
}

export { VIZ_TYPES };
