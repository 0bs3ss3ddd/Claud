// ЮKassa с подменённым fetch: платёж применяется только после сверки с API.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, client, registered } from './helpers.js';

const remote = new Map();
let created = 0;
async function fakeFetch(url, opts = {}) {
  const u = new URL(url);
  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  if (u.host !== 'api.yookassa.test') return json(404, {});
  if (!String(opts.headers?.Authorization).startsWith('Basic ')) return json(401, {});
  if (opts.method === 'POST' && u.pathname === '/v3/payments') {
    const body = JSON.parse(opts.body);
    const id = `yk-${++created}-0000000000`;
    const p = { id, status: 'pending', paid: false, amount: body.amount, metadata: body.metadata, confirmation: { confirmation_url: `https://yoomoney.ru/checkout/payments/v2/contract?orderId=${id}` } };
    remote.set(id, p);
    return json(200, p);
  }
  const m = u.pathname.match(/^\/v3\/payments\/(.+)$/);
  if (opts.method === 'GET' && m) return remote.has(m[1]) ? json(200, remote.get(m[1])) : json(404, {});
  return json(404, {});
}

let srv;
before(async () => {
  srv = await startServer({ YOOKASSA_SHOP_ID: '123', YOOKASSA_SECRET_KEY: 'test_secret', YOOKASSA_API_BASE: 'https://api.yookassa.test/v3' }, { fetchImpl: fakeFetch });
});
after(async () => { await srv.close(); });

test('создание платежа ЮKassa и ссылка на оплату', async () => {
  const c = await registered(srv.base);
  const r = await c.post('/api/payments', {});
  assert.equal(r.status, 201);
  assert.equal(r.data.mode, 'yookassa');
  assert.match(r.data.confirmationUrl, /^https:\/\/yoomoney\.ru\//);
  const p = [...remote.values()].at(-1);
  assert.equal(p.amount.value, '499.00');
  assert.equal(p.amount.currency, 'RUB');
  assert.equal(p.metadata.payment_id, r.data.id);
  // демо-подтверждение в боевом режиме недоступно
  assert.equal((await c.post(`/api/payments/${r.data.id}/demo-confirm`)).status, 404);
});

test('поддельный webhook не включает тариф, настоящий — включает один раз', async () => {
  const c = await registered(srv.base);
  const { data } = await c.post('/api/payments', {});
  const p = [...remote.values()].at(-1);

  // Атакующий шлёт «payment.succeeded», но в ЮKassa платёж ещё pending
  const hook = (body) => fetch(srv.base + '/api/webhooks/yookassa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  let r = await hook({ type: 'notification', event: 'payment.succeeded', object: { id: p.id, status: 'succeeded', paid: true } });
  assert.equal(r.status, 200);
  assert.equal((await c.get('/api/me')).data.access.plan, 'free');

  // Платёж действительно оплачен
  p.status = 'succeeded';
  p.paid = true;
  r = await hook({ event: 'payment.succeeded', object: { id: p.id } });
  assert.equal(r.status, 200);
  const me = (await c.get('/api/me')).data.access;
  assert.equal(me.plan, 'pro');
  // Повторное уведомление не продлевает
  await hook({ event: 'payment.succeeded', object: { id: p.id } });
  assert.equal((await c.get('/api/me')).data.access.proUntil, me.proUntil);
  assert.equal((await c.get(`/api/payments/${data.id}`)).data.payment.status, 'succeeded');
});

test('несовпадение суммы в ЮKassa не включает тариф', async () => {
  const c = await registered(srv.base);
  const { data } = await c.post('/api/payments', {});
  const p = [...remote.values()].at(-1);
  p.status = 'succeeded';
  p.paid = true;
  p.amount = { value: '1.00', currency: 'RUB' };
  const r = await c.get(`/api/payments/${data.id}`);
  assert.equal(r.data.payment.status, 'pending');
  assert.equal(r.data.access.plan, 'free');
});

test('оплата требует входа', async () => {
  const guest = client(srv.base);
  assert.equal((await guest.post('/api/payments', {})).status, 401);
});
