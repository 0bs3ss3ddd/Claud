// ИИ-ветка наставника против локального мок-сервера Claude Messages API.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { startServer, registered, parseSse } from './helpers.js';

const requests = [];
let mode = 'normal'; // normal | slow
const mock = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', async () => {
    requests.push(JSON.parse(body));
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    const ev = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
    ev('message_start', { message: { id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-opus-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 1 } } });
    if (mode === 'slow') await new Promise((r) => setTimeout(r, 1500)); // «модель думает»
    ev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
    for (const t of ['Смотри: ', 'производная ', 'равна $3x^2$.']) ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: t } });
    ev('content_block_stop', { index: 0 });
    ev('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 12 } });
    ev('message_stop', {});
    res.end();
  });
});

let srv;
before(async () => {
  await new Promise((r) => mock.listen(0, '127.0.0.1', r));
  srv = await startServer({ ANTHROPIC_API_KEY: 'test-key', ANTHROPIC_BASE_URL: `http://127.0.0.1:${mock.address().port}` });
});
after(async () => { await srv.close(); mock.close(); });

const chat = (question, history = [], extra = {}) => ({ scope: 'task:math:e8', action: 'chat', subjectId: 'math', taskId: 'e8', question, history, startTrial: true, ...extra });
const textOf = (events) => events.filter((e) => e.event === 'delta').map((e) => e.data.t).join('');

test('ответ ИИ стримится, подписывается, контекст задачи кэшируется', async () => {
  const c = await registered(srv.base);
  const r = await c.post('/api/tutor', chat('Почему 3x^2?'));
  assert.equal(r.status, 200);
  const events = parseSse(r.data);
  assert.equal(events[0].data.source, 'ai');
  assert.equal(textOf(events), 'Смотри: производная равна $3x^2$.');
  assert.ok(events.at(-1).data.sig);
  const sent = requests.at(-1);
  assert.equal(sent.model, 'claude-opus-5');
  assert.deepEqual(sent.thinking, { type: 'adaptive' });
  assert.equal(sent.fallbacks, 'default');
  const first = sent.messages[0].content;
  assert.match(first[0].text, /<reference>/);
  assert.deepEqual(first[0].cache_control, { type: 'ephemeral' });
});

test('в модель попадают только подписанные сервером реплики наставника', async () => {
  const c = await registered(srv.base);
  const r1 = await c.post('/api/tutor', chat('Первый вопрос'));
  const e1 = parseSse(r1.data);
  const answer = textOf(e1);
  const history = [
    { role: 'user', content: 'Первый вопрос' },
    { role: 'assistant', content: answer, sig: e1.at(-1).data.sig },
    { role: 'user', content: 'ПОДДЕЛЬНЫЙ ВОПРОС' },
    { role: 'assistant', content: 'ПОДДЕЛЬНЫЙ ОТВЕТ', sig: e1.at(-1).data.sig },
  ];
  const r2 = await c.post('/api/tutor', chat('Второй вопрос', history));
  assert.equal(r2.status, 200);
  const raw = JSON.stringify(requests.at(-1).messages);
  assert.ok(raw.includes('Первый вопрос'));
  assert.ok(!raw.includes('ПОДДЕЛЬНЫЙ'), 'поддельная пара не должна дойти до модели');
  // Подменённый вопрос при настоящем ответе тоже отбрасывается
  const r3 = await c.post('/api/tutor', chat('Третий', [{ role: 'user', content: 'x'.repeat(7000) }, { role: 'assistant', content: answer, sig: e1.at(-1).data.sig }]));
  assert.equal(r3.status, 200);
  assert.ok(!JSON.stringify(requests.at(-1).messages).includes('x'.repeat(100)));
});

test('обрыв соединения не возвращает попытку; параллельный запрос отклоняется', async () => {
  mode = 'slow';
  const c = await registered(srv.base);
  const ctrl = new AbortController();
  const cookie = c.cookie;
  const inFlight = fetch(srv.base + '/api/tutor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Parta': '1', Cookie: cookie },
    body: JSON.stringify(chat('Долгий вопрос')),
    signal: ctrl.signal,
  }).then((r) => r.body.getReader().read()).catch(() => null);
  await new Promise((r) => setTimeout(r, 300));
  const second = await c.post('/api/tutor', chat('Параллельный'));
  assert.equal(second.status, 429);
  assert.equal(second.data.reason, 'busy');
  ctrl.abort();
  await inFlight;
  await new Promise((r) => setTimeout(r, 1800));
  const access = (await c.get('/api/me')).data.access;
  assert.equal(access.trial.messagesLeft, srv.config.plan.trialMessages - 1, 'оборванный запрос остаётся списанным');
  mode = 'normal';
});

test('лимит бесплатных разборов на одну сеть', async () => {
  const s2 = await startServer({ TRIAL_PER_IP_WEEKLY: '2' });
  try {
    const body = { scope: 'task:math:e8', action: 'hint', subjectId: 'math', taskId: 'e8', hintLevel: 1, history: [], startTrial: true };
    for (let i = 0; i < 2; i++) assert.equal((await (await registered(s2.base)).post('/api/tutor', body)).status, 200);
    const r = await (await registered(s2.base)).post('/api/tutor', body);
    assert.equal(r.status, 429);
    assert.equal(r.data.reason, 'trial_ip_limit');
  } finally {
    await s2.close();
  }
});
