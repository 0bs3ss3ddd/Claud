import { loadConfig } from '../server/config.js';
import { createApp } from '../server/app.js';

export const silentLog = { error() {}, warn() {}, log() {} };

export async function startServer(env = {}, { fetchImpl } = {}) {
  const config = loadConfig({ NODE_ENV: 'test', DB_PATH: ':memory:', PUBLIC_URL: 'http://127.0.0.1', MEDIA_FETCH: 'false', RATE_LIMIT_SCALE: '50', ...env });
  const ctx = await createApp(config, { fetchImpl, log: silentLog });
  const server = await new Promise((resolve) => {
    const s = ctx.app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  return { ...ctx, config, base, close: () => new Promise((r) => server.close(r)) };
}

/** Клиент с cookie-сессией, как у браузера. */
export function client(base) {
  let cookie = '';
  async function request(method, path, body, headers = {}) {
    const res = await fetch(base + path, {
      method,
      headers: {
        'X-Parta': '1',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0];
    const type = res.headers.get('content-type') ?? '';
    const data = type.includes('json') ? await res.json() : await res.text();
    return { status: res.status, data, headers: res.headers };
  }
  return {
    get: (p, h) => request('GET', p, undefined, h),
    post: (p, b = {}, h) => request('POST', p, b, h),
    get cookie() { return cookie; },
  };
}

export async function registered(base, name = 'Тест') {
  const c = client(base);
  const email = `u${Math.random().toString(36).slice(2)}@example.com`;
  const r = await c.post('/api/auth/register', { email, password: 'password123', name });
  if (r.status !== 201) throw new Error('register failed: ' + JSON.stringify(r.data));
  return c;
}

/** Разбирает тело SSE-ответа на события. */
export function parseSse(text) {
  return text.split('\n\n').filter((c) => c.startsWith('event:')).map((chunk) => {
    const [ev, data] = chunk.split('\n');
    return { event: ev.slice(7), data: JSON.parse(data.slice(6)) };
  });
}
