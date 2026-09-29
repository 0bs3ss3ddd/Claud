// YandexGPT, GigaChat и DeepSeek против локальных мок-серверов с их протоколами,
// плюс резервирование: если основной провайдер упал, отвечает следующий.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { startServer, registered, parseSse } from './helpers.js';

const log = [];
let fail = new Set(); // провайдеры, которые сейчас отвечают 500
let refuse = new Set(); // провайдеры, которые сейчас отказывают
let oauthCalls = 0;

function readBody(req) {
  return new Promise((resolve) => {
    let b = '';
    req.on('data', (c) => { b += c; });
    req.on('end', () => resolve(b));
  });
}

const mock = http.createServer(async (req, res) => {
  const body = await readBody(req);
  const entry = { url: req.url, headers: req.headers, body };
  log.push(entry);

  // ---- YandexGPT: NDJSON, текст в каждой строке — накопленный ----
  if (req.url === '/yandex/foundationModels/v1/completion') {
    if (fail.has('yandexgpt')) { res.writeHead(500); return res.end('{"error":"boom"}'); }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const parts = ['Проверим ', 'Проверим производную: ', 'Проверим производную: $3x^2$.'];
    for (const [i, text] of parts.entries()) {
      const last = i === parts.length - 1;
      const status = last ? (refuse.has('yandexgpt') ? 'ALTERNATIVE_STATUS_CONTENT_FILTER' : 'ALTERNATIVE_STATUS_FINAL') : 'ALTERNATIVE_STATUS_PARTIAL';
      res.write(JSON.stringify({ result: { alternatives: [{ message: { role: 'assistant', text }, status }], usage: {}, modelVersion: 'test' } }) + '\n');
    }
    return res.end();
  }

  // ---- GigaChat: OAuth ----
  if (req.url === '/giga/oauth') {
    oauthCalls++;
    const ok = req.headers.authorization === 'Basic dGVzdDp0ZXN0'
      && /^[0-9a-f-]{36}$/.test(req.headers.rquid ?? '')
      && body === 'scope=GIGACHAT_API_PERS';
    if (!ok) { res.writeHead(401); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ access_token: 'giga-token', expires_at: Date.now() + 30 * 60_000 }));
  }
  // ---- GigaChat и DeepSeek: SSE в формате OpenAI ----
  const openAi = { '/giga/api/v1/chat/completions': 'gigachat', '/deepseek/chat/completions': 'deepseek' }[req.url];
  if (openAi) {
    const expected = openAi === 'gigachat' ? 'Bearer giga-token' : 'Bearer ds-key';
    if (req.headers.authorization !== expected) { res.writeHead(401); return res.end(); }
    if (fail.has(openAi)) { res.writeHead(503); return res.end('{"error":{"message":"overloaded"}}'); }
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    const chunk = (delta, finish = null) => res.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`);
    if (openAi === 'deepseek') chunk({ reasoning_content: 'СКРЫТЫЕ РАССУЖДЕНИЯ' });
    chunk({ role: 'assistant', content: `${openAi}: ` });
    chunk({ content: 'ответ ' });
    chunk({ content: 'готов.' }, refuse.has(openAi) ? (openAi === 'gigachat' ? 'blacklist' : 'content_filter') : 'stop');
    res.write('data: [DONE]\n\n');
    return res.end();
  }
  res.writeHead(404);
  res.end();
});

let base;
const envFor = (providers) => ({
  TUTOR_PROVIDERS: providers,
  YANDEX_API_KEY: 'ya-key', YANDEX_FOLDER_ID: 'b1gfolder', YANDEX_API_BASE: `${base}/yandex`,
  GIGACHAT_AUTH_KEY: 'dGVzdDp0ZXN0', GIGACHAT_API_BASE: `${base}/giga/api/v1`, GIGACHAT_AUTH_URL: `${base}/giga/oauth`,
  DEEPSEEK_API_KEY: 'ds-key', DEEPSEEK_API_BASE: `${base}/deepseek`,
});

before(async () => {
  await new Promise((r) => mock.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${mock.address().port}`;
});
after(() => mock.close());

const ask = (question, extra = {}) => ({ scope: 'task:math:e8', action: 'chat', subjectId: 'math', taskId: 'e8', question, history: [], startTrial: true, ...extra });
const textOf = (events) => events.filter((e) => e.event === 'delta').map((e) => e.data.t).join('');
const lastRequest = (path) => [...log].reverse().find((e) => e.url === path);

async function withServer(providers, fn) {
  const srv = await startServer(envFor(providers));
  try { return await fn(srv); } finally { await srv.close(); }
}

test('YandexGPT: modelUri, Api-Key, накопленный текст превращается в порции', () => withServer('yandexgpt', async (srv) => {
  const cfg = (await (await fetch(srv.base + '/api/config')).json());
  assert.equal(cfg.aiEnabled, true);
  assert.deepEqual(cfg.aiProviders.map((p) => p.id), ['yandexgpt']);
  const c = await registered(srv.base);
  const r = await c.post('/api/tutor', ask('Почему 3x^2?'));
  const events = parseSse(r.data);
  assert.equal(textOf(events), 'Проверим производную: $3x^2$.');
  assert.equal(events.at(-1).event, 'done');
  assert.equal(events.at(-1).data.provider, 'yandexgpt');
  assert.ok(events.at(-1).data.sig);
  const req = lastRequest('/yandex/foundationModels/v1/completion');
  assert.equal(req.headers.authorization, 'Api-Key ya-key');
  assert.equal(req.headers['x-folder-id'], 'b1gfolder');
  const body = JSON.parse(req.body);
  assert.equal(body.modelUri, 'gpt://b1gfolder/yandexgpt/latest');
  assert.equal(body.completionOptions.stream, true);
  assert.equal(body.messages[0].role, 'system');
  assert.match(body.messages[1].text, /<reference>/);
  assert.match(body.messages.at(-1).text, /Почему 3x\^2\?/);
}));

test('GigaChat: OAuth с RqUID, токен кэшируется, ответ стримится', () => withServer('gigachat', async (srv) => {
  oauthCalls = 0;
  const c = await registered(srv.base);
  let r = await c.post('/api/tutor', ask('Вопрос 1'));
  assert.equal(textOf(parseSse(r.data)), 'gigachat: ответ готов.');
  r = await c.post('/api/tutor', ask('Вопрос 2'));
  assert.equal(parseSse(r.data).at(-1).data.provider, 'gigachat');
  assert.equal(oauthCalls, 1, 'токен запрашивается один раз на 30 минут');
  const body = JSON.parse(lastRequest('/giga/api/v1/chat/completions').body);
  assert.equal(body.model, 'GigaChat-2-Max');
  assert.equal(body.stream, true);
  assert.equal(body.messages[0].role, 'system');
}));

test('DeepSeek: режим рассуждений включён, рассуждения ученику не показываются', () => withServer('deepseek', async (srv) => {
  const c = await registered(srv.base);
  const r = await c.post('/api/tutor', ask('Реши'));
  const text = textOf(parseSse(r.data));
  assert.equal(text, 'deepseek: ответ готов.');
  assert.ok(!text.includes('СКРЫТЫЕ'));
  const body = JSON.parse(lastRequest('/deepseek/chat/completions').body);
  assert.equal(body.model, 'deepseek-v4-pro');
  assert.deepEqual(body.thinking, { type: 'enabled' });
  assert.equal(body.reasoning_effort, 'high');
}));

test('резерв: основной провайдер упал — отвечает следующий, попытка списана один раз', () => withServer('deepseek,gigachat,yandexgpt', async (srv) => {
  fail = new Set(['deepseek']);
  try {
    const c = await registered(srv.base);
    const r = await c.post('/api/tutor', ask('Вопрос'));
    const events = parseSse(r.data);
    assert.equal(events.at(-1).data.provider, 'gigachat');
    assert.equal(textOf(events), 'gigachat: ответ готов.');
    assert.equal((await c.get('/api/me')).data.access.trial.messagesLeft, srv.config.plan.trialMessages - 1);

    fail = new Set(['deepseek', 'gigachat', 'yandexgpt']);
    const r2 = await c.post('/api/tutor', ask('Ещё'));
    const e2 = parseSse(r2.data);
    assert.equal(e2.at(-1).event, 'error');
    assert.match(e2.at(-1).data.error, /перегружен/);
    assert.equal((await c.get('/api/me')).data.access.trial.messagesLeft, srv.config.plan.trialMessages - 1, 'при полном отказе попытка возвращается');
  } finally {
    fail = new Set();
  }
}));

test('отказ модели (фильтр контента) превращается в понятное сообщение', () => withServer('gigachat', async (srv) => {
  refuse = new Set(['gigachat']);
  try {
    const c = await registered(srv.base);
    const r = await c.post('/api/tutor', ask('Что-то запрещённое'));
    assert.equal(parseSse(r.data).at(-1).event, 'refusal');
  } finally {
    refuse = new Set();
  }
}));

test('провайдер без ключей в TUTOR_PROVIDERS пропускается', async () => {
  const srv = await startServer({ TUTOR_PROVIDERS: 'anthropic,deepseek', DEEPSEEK_API_KEY: 'ds-key', DEEPSEEK_API_BASE: `${base}/deepseek` });
  try {
    const cfg = await (await fetch(srv.base + '/api/config')).json();
    assert.deepEqual(cfg.aiProviders.map((p) => p.id), ['deepseek']);
    assert.equal(cfg.aiProviders[0].country, 'Китай');
  } finally {
    await srv.close();
  }
});
