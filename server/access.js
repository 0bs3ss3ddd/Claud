// Тарифы и доступ к наставнику.
// «Ученик» (бесплатно): все материалы, ответы и краткие решения + 1 пробный разбор наставника в неделю.
// «Отличник» (499 ₽ / 30 дней): наставник без недельного ограничения (с дневным лимитом от злоупотреблений).
import { tx } from './db.js';

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000; // Москва: UTC+3 круглый год
const DAY_MS = 24 * 60 * 60 * 1000;

/** Понедельник текущей недели по Москве (YYYY-MM-DD) и момент следующего сброса. */
export function weekInfo(now = Date.now()) {
  const msk = new Date(now + MSK_OFFSET_MS);
  const dow = (msk.getUTCDay() + 6) % 7; // 0 = понедельник
  const mondayMsk = Date.UTC(msk.getUTCFullYear(), msk.getUTCMonth(), msk.getUTCDate()) - dow * DAY_MS;
  return {
    weekKey: new Date(mondayMsk).toISOString().slice(0, 10),
    nextResetAt: mondayMsk + 7 * DAY_MS - MSK_OFFSET_MS,
  };
}

export function dayKey(now = Date.now()) {
  return new Date(now + MSK_OFFSET_MS).toISOString().slice(0, 10);
}

const SCOPE_RE = /^(task:[a-z0-9]{2,16}:[a-z0-9]{2,16}|chat:[A-Za-z0-9_-]{8,40})$/;
export function isValidScope(scope) {
  return typeof scope === 'string' && SCOPE_RE.test(scope);
}

export function createAccess(db, config) {
  const { trialMessages, proDailyLimit, periodDays, trialIpWeekly, trialAiDaily } = config.plan;
  const q = {
    trial: db.prepare('SELECT scope, messages_used FROM trials WHERE user_id = ? AND week_key = ?'),
    insertTrial: db.prepare('INSERT OR IGNORE INTO trials (user_id, week_key, scope, messages_used, created_at) VALUES (?, ?, ?, 0, ?)'),
    useTrial: db.prepare('UPDATE trials SET messages_used = messages_used + 1 WHERE user_id = ? AND week_key = ? AND scope = ? AND messages_used < ?'),
    usage: db.prepare('SELECT count FROM usage_daily WHERE user_id = ? AND day = ?'),
    useDaily: db.prepare(`INSERT INTO usage_daily (user_id, day, count) VALUES (?, ?, 1)
      ON CONFLICT(user_id, day) DO UPDATE SET count = count + 1 WHERE count < ?`),
    proUntil: db.prepare('SELECT pro_until FROM users WHERE id = ?'),
    ipTrials: db.prepare('SELECT count FROM trial_ips WHERE ip = ? AND week_key = ?'),
    addIpTrial: db.prepare(`INSERT INTO trial_ips (ip, week_key, count) VALUES (?, ?, 1)
      ON CONFLICT(ip, week_key) DO UPDATE SET count = count + 1`),
    useGlobal: db.prepare(`INSERT INTO usage_global (day, count) VALUES (?, 1)
      ON CONFLICT(day) DO UPDATE SET count = count + 1 WHERE count < ?`),
    extendPro: db.prepare('UPDATE users SET pro_until = ? WHERE id = ?'),
  };

  function status(user, now = Date.now()) {
    if (!user) return { plan: 'guest' };
    const proUntil = Number(q.proUntil.get(user.id)?.pro_until ?? 0);
    const pro = proUntil > now;
    const { weekKey, nextResetAt } = weekInfo(now);
    const t = q.trial.get(user.id, weekKey);
    const used = Number(q.usage.get(user.id, dayKey(now))?.count ?? 0);
    return {
      plan: pro ? 'pro' : 'free',
      proUntil: pro ? proUntil : null,
      trial: {
        available: !t,
        scope: t?.scope ?? null,
        messagesLeft: t ? Math.max(0, trialMessages - t.messages_used) : trialMessages,
        messagesTotal: trialMessages,
        nextResetAt,
      },
      daily: pro ? { used, limit: proDailyLimit } : null,
    };
  }

  /**
   * Проверяет и сразу списывает одно сообщение наставника (атомарно).
   * @returns {{ ok: true, mode: 'pro'|'trial' } | { ok: false, reason: string, status: number }}
   */
  function consume(user, scope, { startTrial = false, ip = null } = {}, now = Date.now()) {
    if (!user) return { ok: false, reason: 'auth', status: 401 };
    if (!isValidScope(scope)) return { ok: false, reason: 'bad_scope', status: 400 };
    const st = status(user, now);
    if (st.plan === 'pro') {
      const r = q.useDaily.run(user.id, dayKey(now), proDailyLimit);
      if (r.changes === 0) return { ok: false, reason: 'daily_limit', status: 429 };
      return { ok: true, mode: 'pro' };
    }
    const { weekKey } = weekInfo(now);
    return tx(db, () => {
      let t = q.trial.get(user.id, weekKey);
      if (!t) {
        if (!startTrial) return { ok: false, reason: 'trial_available', status: 402 };
        const ipKey = String(ip ?? 'unknown').slice(0, 64);
        if (Number(q.ipTrials.get(ipKey, weekKey)?.count ?? 0) >= trialIpWeekly) {
          return { ok: false, reason: 'trial_ip_limit', status: 429 };
        }
        q.addIpTrial.run(ipKey, weekKey);
        q.insertTrial.run(user.id, weekKey, scope, now);
        t = q.trial.get(user.id, weekKey);
      }
      if (t.scope !== scope) return { ok: false, reason: 'trial_used', status: 402 };
      const r = q.useTrial.run(user.id, weekKey, scope, trialMessages);
      if (r.changes === 0) return { ok: false, reason: 'trial_exhausted', status: 402 };
      return { ok: true, mode: 'trial' };
    });
  }

  /** Общий дневной лимит ИИ-сообщений в бесплатных разборах (защита бюджета API). */
  function consumeTrialAiBudget(now = Date.now()) {
    return q.useGlobal.run(dayKey(now), trialAiDaily).changes > 0;
  }

  /** Возврат списанного сообщения, если наставник не смог ответить (ошибка API). */
  const refundTrial = db.prepare('UPDATE trials SET messages_used = messages_used - 1 WHERE user_id = ? AND week_key = ? AND messages_used > 0');
  const refundDaily = db.prepare('UPDATE usage_daily SET count = count - 1 WHERE user_id = ? AND day = ? AND count > 0');
  function refund(user, mode, now = Date.now()) {
    if (mode === 'trial') refundTrial.run(user.id, weekInfo(now).weekKey);
    else if (mode === 'pro') refundDaily.run(user.id, dayKey(now));
  }

  /** Продлевает «Отличника» на periodDays от max(сейчас, текущий срок). */
  function extendPro(userId, days = periodDays, now = Date.now()) {
    const current = Number(q.proUntil.get(userId)?.pro_until ?? 0);
    const until = Math.max(now, current) + days * DAY_MS;
    q.extendPro.run(until, userId);
    return until;
  }

  return { status, consume, refund, extendPro, consumeTrialAiBudget };
}
