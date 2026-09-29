// GigaChat (Сбер): OAuth-токен на 30 минут + Chat Completions в формате OpenAI.
// Сервера Сбера используют сертификат НУЦ Минцифры — его нужно добавить в доверенные
// (GIGACHAT_CA_CERT или NODE_EXTRA_CA_CERTS, см. README).
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import tls from 'node:tls';
import { ProviderError, ensureOk, request, consumeOpenAiStream, withContext } from './common.js';

/** Добавляет корневые сертификаты Минцифры к доверенным (не заменяя системные). */
export function trustExtraCa(paths, log = console) {
  const list = String(paths ?? '').split(',').map((p) => p.trim()).filter(Boolean);
  if (!list.length) return false;
  if (typeof tls.setDefaultCACertificates !== 'function' || typeof tls.getCACertificates !== 'function') {
    log.warn('[gigachat] эта версия Node не умеет добавлять сертификаты из кода — задайте NODE_EXTRA_CA_CERTS');
    return false;
  }
  const pems = list.map((p) => {
    const raw = readFileSync(p);
    const text = raw.toString('latin1');
    if (text.includes('-----BEGIN CERTIFICATE-----')) return text;
    const b64 = raw.toString('base64').match(/.{1,64}/g).join('\n');
    return `-----BEGIN CERTIFICATE-----\n${b64}\n-----END CERTIFICATE-----\n`;
  });
  tls.setDefaultCACertificates([...tls.getCACertificates('default'), ...pems]);
  return true;
}

export function createGigaChatProvider(cfg, { fetchImpl }) {
  let token = null; // { value, expiresAt }
  let pending = null;

  async function getToken(force = false) {
    if (!force && token && token.expiresAt - 60_000 > Date.now()) return token.value;
    pending ??= (async () => {
      const res = await request(fetchImpl, cfg.authUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${cfg.authKey}`,
          RqUID: randomUUID(),
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({ scope: cfg.scope }).toString(),
        signal: AbortSignal.timeout(15000),
      }, 'gigachat');
      await ensureOk(res, 'gigachat');
      const data = await res.json();
      if (typeof data?.access_token !== 'string') throw new ProviderError('gigachat: нет access_token', { status: 502, provider: 'gigachat' });
      const exp = Number(data.expires_at);
      // expires_at приходит в миллисекундах (на всякий случай понимаем и секунды)
      const expiresAt = exp > 1e12 ? exp : exp > 1e9 ? exp * 1000 : Date.now() + 25 * 60_000;
      token = { value: data.access_token, expiresAt };
      return token.value;
    })().finally(() => { pending = null; });
    return pending;
  }

  async function post(body, signal, retry = true) {
    const res = await request(fetchImpl, `${cfg.apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await getToken()}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(body),
      signal,
    }, 'gigachat');
    if (res.status === 401 && retry) {
      token = null;
      await getToken(true);
      return post(body, signal, false);
    }
    await ensureOk(res, 'gigachat');
    return res;
  }

  return {
    id: 'gigachat',
    title: 'GigaChat',
    maxContextChars: 300000,

    async stream({ system, context, turns, action, signal, onText }) {
      const res = await post({
        model: cfg.model,
        messages: [{ role: 'system', content: system }, ...withContext(turns, context)],
        stream: true,
        max_tokens: action === 'hint' ? Math.min(cfg.maxTokens, 800) : cfg.maxTokens,
      }, signal);
      const { finish } = await consumeOpenAiStream(res, onText, 'gigachat');
      if (finish === 'blacklist') return { stop: 'refusal' };
      return { stop: finish === 'length' ? 'max_tokens' : 'end' };
    },
  };
}
