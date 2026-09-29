// Оплата тарифа «Отличник»: ЮKassa (боевой режим) или демо-оплата (разработка).
// Разовый платёж на 30 дней, без автосписаний. Статус платежа всегда проверяется
// запросом к API ЮKassa — телу уведомления (webhook) мы не доверяем.
import { randomUUID } from 'node:crypto';
import { tx } from './db.js';

const ID_RE = /^[0-9a-f-]{36}$/;

export function createPayments({ db, config, access, fetchImpl = fetch, log = console }) {
  const { yookassa, demo } = config.payments;
  const { priceRub, periodDays } = config.plan;
  const mode = yookassa ? 'yookassa' : demo ? 'demo' : 'off';

  const q = {
    insert: db.prepare(`INSERT INTO payments (id, user_id, provider, provider_id, status, amount_kop, period_days, created_at, updated_at)
      VALUES (?, ?, ?, NULL, 'pending', ?, ?, ?, ?)`),
    setProvider: db.prepare('UPDATE payments SET provider_id = ?, status = ?, updated_at = ? WHERE id = ?'),
    byId: db.prepare('SELECT * FROM payments WHERE id = ?'),
    byProviderId: db.prepare('SELECT * FROM payments WHERE provider = ? AND provider_id = ?'),
    listByUser: db.prepare('SELECT id, provider, status, amount_kop, period_days, created_at FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 20'),
    setStatus: db.prepare('UPDATE payments SET status = ?, updated_at = ? WHERE id = ? AND applied = 0'),
    markApplied: db.prepare("UPDATE payments SET status = 'succeeded', applied = 1, updated_at = ? WHERE id = ? AND applied = 0"),
    pendingCount: db.prepare("SELECT COUNT(*) AS n FROM payments WHERE user_id = ? AND status = 'pending' AND created_at > ?"),
  };

  const authHeader = yookassa
    ? 'Basic ' + Buffer.from(`${yookassa.shopId}:${yookassa.secretKey}`).toString('base64')
    : null;

  async function ykRequest(method, path, body, idempotenceKey) {
    const headers = { Authorization: authHeader, 'Content-Type': 'application/json' };
    if (idempotenceKey) headers['Idempotence-Key'] = idempotenceKey;
    const r = await fetchImpl(`${yookassa.apiBase}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const err = new Error(`ЮKassa ${r.status}: ${data?.description ?? 'ошибка'}`);
      err.status = r.status;
      throw err;
    }
    return data;
  }

  /** Применяет успешный платёж ровно один раз. */
  function applySucceeded(row) {
    return tx(db, () => {
      const r = q.markApplied.run(Date.now(), row.id);
      if (r.changes === 0) return false;
      access.extendPro(row.user_id, row.period_days);
      return true;
    });
  }

  /** Сверяет платёж с API ЮKassa и применяет, если он действительно оплачен. */
  async function syncYookassa(row) {
    if (!yookassa || row.provider !== 'yookassa' || !row.provider_id || row.applied) return row;
    const remote = await ykRequest('GET', `/payments/${encodeURIComponent(row.provider_id)}`);
    const expected = (row.amount_kop / 100).toFixed(2);
    const valid =
      remote?.id === row.provider_id &&
      remote?.amount?.value === expected &&
      remote?.amount?.currency === 'RUB' &&
      remote?.metadata?.payment_id === row.id;
    if (!valid) {
      log.warn('[payments] данные ЮKassa не совпали с заказом', row.id);
      return row;
    }
    if (remote.status === 'succeeded' && remote.paid === true) applySucceeded(row);
    else if (remote.status === 'canceled') q.setStatus.run('canceled', Date.now(), row.id);
    return q.byId.get(row.id);
  }

  function publicPayment(row) {
    return {
      id: row.id,
      provider: row.provider,
      status: row.status,
      amount: row.amount_kop / 100,
      periodDays: row.period_days,
      createdAt: row.created_at,
    };
  }

  function ownPayment(req, res) {
    const id = String(req.params.id ?? '');
    const row = ID_RE.test(id) ? q.byId.get(id) : null;
    if (!row || row.user_id !== req.user.id) {
      res.status(404).json({ error: 'Платёж не найден' });
      return null;
    }
    return row;
  }

  return {
    mode,

    async create(req, res) {
      if (mode === 'off') return res.status(503).json({ error: 'Оплата временно недоступна' });
      const now = Date.now();
      if (q.pendingCount.get(req.user.id, now - 60 * 60 * 1000).n >= 5) {
        return res.status(429).json({ error: 'Слишком много незавершённых платежей. Попробуй позже.' });
      }
      const id = randomUUID();
      const amountKop = priceRub * 100;
      q.insert.run(id, req.user.id, mode, amountKop, periodDays, now, now);

      if (mode === 'demo') {
        return res.status(201).json({ id, mode, confirmationUrl: `/pay/demo/${id}` });
      }

      const value = (amountKop / 100).toFixed(2);
      const body = {
        amount: { value, currency: 'RUB' },
        capture: true,
        confirmation: { type: 'redirect', return_url: `${config.publicUrl}/payment/return?id=${id}` },
        description: `${config.brand}: тариф «Отличник» на ${periodDays} дней`,
        metadata: { payment_id: id, user_id: String(req.user.id) },
      };
      if (yookassa.sendReceipt) {
        body.receipt = {
          customer: { email: req.user.email },
          items: [{
            description: `Доступ к онлайн-наставнику на ${periodDays} дней`,
            quantity: '1.00',
            amount: { value, currency: 'RUB' },
            vat_code: yookassa.vatCode,
            payment_mode: 'full_payment',
            payment_subject: 'service',
          }],
        };
      }
      try {
        const remote = await ykRequest('POST', '/payments', body, id);
        const url = remote?.confirmation?.confirmation_url;
        if (!remote?.id || typeof url !== 'string' || !url.startsWith('https://')) throw new Error('нет confirmation_url');
        q.setProvider.run(remote.id, 'pending', Date.now(), id);
        res.status(201).json({ id, mode, confirmationUrl: url });
      } catch (err) {
        q.setStatus.run('failed', Date.now(), id);
        log.error('[payments] не удалось создать платёж:', err.message);
        res.status(502).json({ error: 'Платёжный сервис не ответил. Попробуй ещё раз.' });
      }
    },

    list(req, res) {
      res.json({ payments: q.listByUser.all(req.user.id).map(publicPayment) });
    },

    async status(req, res) {
      let row = ownPayment(req, res);
      if (!row) return;
      if (row.status === 'pending' && row.provider === 'yookassa') {
        try { row = await syncYookassa(row); } catch (err) { log.error('[payments] проверка статуса:', err.message); }
      }
      res.json({ payment: publicPayment(row), access: access.status(req.user) });
    },

    demoConfirm(req, res) {
      if (mode !== 'demo') return res.status(404).json({ error: 'Не найдено' });
      const row = ownPayment(req, res);
      if (!row) return;
      if (row.provider !== 'demo' || row.status !== 'pending') return res.status(409).json({ error: 'Платёж уже обработан' });
      applySucceeded(row);
      res.json({ payment: publicPayment(q.byId.get(row.id)), access: access.status(req.user) });
    },

    async webhook(req, res) {
      // Отвечаем 200 всегда, чтобы ЮKassa не повторяла уведомление бесконечно;
      // реальный статус берём только из API.
      const providerId = req.body?.object?.id;
      if (!yookassa || typeof providerId !== 'string' || !/^[\w-]{10,64}$/.test(providerId)) return res.json({ ok: true });
      const row = q.byProviderId.get('yookassa', providerId);
      if (row && !row.applied) {
        try { await syncYookassa(row); } catch (err) {
          log.error('[payments] webhook:', err.message);
          return res.status(500).json({ ok: false }); // пусть ЮKassa повторит позже
        }
      }
      res.json({ ok: true });
    },
  };
}
