// Наставник: подсказки, полные разборы и диалог. Ответ — поток Server-Sent Events.
//  • Подсказки и полные решения задач каталога — проверенные методистами тексты (мгновенно, без ИИ).
//  • Вопросы по задаче и «Решатель» (любая задача) — ИИ (Claude, YandexGPT, GigaChat или DeepSeek)
//    с эталоном задачи в контексте; при сбое основного провайдера — следующий из TUTOR_PROVIDERS.
//  • Без ключей ИИ работает демо-режим: каталог доступен, свободный диалог — нет.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { TUTOR_SYSTEM_PROMPT, buildContext, actionText } from './prompts.js';
import { isValidScope } from './access.js';
import { createProviders, PROVIDER_INFO } from './llm/index.js';
import { ProviderError, trimTurns } from './llm/common.js';

const MAX_HISTORY = 16;
const MAX_USER_MSG = 8000;
const MAX_ASSISTANT_MSG = 24000;
const MAX_QUESTION = 4000;
const MAX_TOTAL = 90000;

/**
 * Ответы наставника подписываются HMAC (пользователь + scope + текст).
 * История диалога хранится у клиента, поэтому в модель попадают только
 * подписанные сервером реплики наставника — подделать «прошлый ответ» нельзя.
 */
export function signTurn(secret, userId, scope, question, answer) {
  return createHmac('sha256', secret)
    .update(JSON.stringify([userId, scope, question, answer]))
    .digest('base64url');
}
function verifyTurn(secret, userId, scope, question, answer, sig) {
  if (typeof sig !== 'string' || sig.length > 64) return false;
  const expected = Buffer.from(signTurn(secret, userId, scope, question, answer));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
const ACTIONS = new Set(['hint', 'solution', 'chat']);

export function validateTutorRequest(body, content) {
  if (!body || typeof body !== 'object') return { error: 'Пустой запрос' };
  const { scope, action, subjectId, taskId, startTrial } = body;
  if (!ACTIONS.has(action)) return { error: 'Неизвестное действие' };
  if (!isValidScope(scope)) return { error: 'Некорректный scope' };

  let subject = null;
  let task = null;
  if (scope.startsWith('task:')) {
    subject = content.subject(subjectId);
    task = subject ? content.task(subjectId, taskId) : null;
    if (!task || scope !== `task:${subjectId}:${taskId}`) return { error: 'Задача не найдена', status: 404 };
  } else if (scope.startsWith('chat:')) {
    if (action !== 'chat') return { error: 'В свободном диалоге доступны только вопросы' };
    if (subjectId && subjectId !== 'any') {
      subject = content.subject(subjectId);
      if (!subject) return { error: 'Предмет не найден', status: 404 };
    }
  } else {
    return { error: 'Некорректный scope' };
  }

  const mode = body.mode === 'olymp' || task?.kind === 'olymp' ? 'olymp' : 'ege';
  const hintLevel = Number.isInteger(body.hintLevel) && body.hintLevel >= 1 && body.hintLevel <= 5 ? body.hintLevel : 1;

  let question = '';
  if (action === 'chat') {
    question = typeof body.question === 'string' ? body.question.trim() : '';
    if (!question) return { error: 'Напиши вопрос' };
    if (question.length > MAX_QUESTION) return { error: `Слишком длинное сообщение (до ${MAX_QUESTION} символов)` };
  }

  const history = Array.isArray(body.history) ? body.history : [];
  if (history.length > MAX_HISTORY) return { error: 'Диалог слишком длинный — начни новый' };
  let total = 0;
  for (let i = 0; i < history.length; i++) {
    const m = history[i];
    const expected = i % 2 === 0 ? 'user' : 'assistant';
    const max = expected === 'user' ? MAX_USER_MSG : MAX_ASSISTANT_MSG;
    if (!m || m.role !== expected || typeof m.content !== 'string' || !m.content.trim() || m.content.length > max) {
      return { error: 'Некорректная история диалога' };
    }
    total += m.content.length;
  }
  if (history.length % 2 !== 0) return { error: 'Некорректная история диалога' };
  if (total + question.length > MAX_TOTAL) return { error: 'Диалог слишком длинный — начни новый' };

  return { scope, action, subject, task, mode, hintLevel, question, history, startTrial: startTrial === true };
}

/** Какие запросы можно обслужить без ИИ (каталог). */
function catalogAnswer(req) {
  const { action, task, hintLevel } = req;
  if (!task) return null;
  if (action === 'solution') return task.full;
  if (action === 'hint' && hintLevel <= task.hints.length) {
    return `**Подсказка ${hintLevel} из ${task.hints.length}.** ${task.hints[hintLevel - 1]}`;
  }
  return null;
}

const DEMO_NOTE = `Сейчас наставник работает в **демо-режиме**: подсказки и полные разборы задач из каталога доступны, а свободный диалог с ИИ включится, когда администратор сайта подключит ключ одного из ИИ-провайдеров (Claude, YandexGPT, GigaChat или DeepSeek).

Пока можно открыть полное решение этой задачи или взять другую задачу из каталога.`;

function sse(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',
    Connection: 'keep-alive',
  });
  return (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

async function streamText(send, text, isClosed) {
  // Отдаём готовый текст порциями, чтобы интерфейс вёл себя одинаково.
  const step = 48;
  for (let i = 0; i < text.length; i += step) {
    if (isClosed()) return;
    send('delta', { t: text.slice(i, i + step) });
    await new Promise((r) => setTimeout(r, 8));
  }
}

export function createTutor({ config, content, access, fetchImpl = fetch, log = console }) {
  const secret = config.secret;
  const inflight = new Set(); // пользователи, у которых сейчас идёт ответ
  const providers = createProviders(config, { fetchImpl, log });

  /** Спрашивает провайдеров по очереди; к следующему переходим, только если ответ ещё не начался. */
  async function askAi({ parsed, signal, onText }) {
    const context = buildContext({ subject: parsed.subject, task: parsed.task, mode: parsed.mode });
    const allTurns = [...parsed.history, { role: 'user', content: actionText(parsed.action, parsed) }];
    let started = false;
    let lastError = null;
    for (const provider of providers) {
      const turns = trimTurns(allTurns, TUTOR_SYSTEM_PROMPT.length + context.length, provider.maxContextChars);
      try {
        const result = await provider.stream({
          system: TUTOR_SYSTEM_PROMPT,
          context,
          turns,
          action: parsed.action,
          signal,
          onText: (t) => { started = true; onText(t); },
        });
        return { ...result, provider: provider.id };
      } catch (err) {
        if (err?.name === 'AbortError' || started) throw err;
        lastError = err;
        log.error(`[tutor] ${provider.id} не ответил: ${err?.message ?? err}`);
      }
    }
    throw lastError ?? new ProviderError('нет доступных ИИ-провайдеров');
  }

  async function handle(httpReq, res) {
    const parsed = validateTutorRequest(httpReq.body, content);
    if (parsed.error) return res.status(parsed.status ?? 400).json({ error: parsed.error });
    // Оставляем только пары «вопрос — подписанный ответ наставника»
    const verified = [];
    for (let i = 0; i + 1 < parsed.history.length; i += 2) {
      const [q, a] = [parsed.history[i], parsed.history[i + 1]];
      if (httpReq.user && verifyTurn(secret, httpReq.user.id, parsed.scope, q.content, a.content, a.sig)) {
        verified.push({ role: 'user', content: q.content }, { role: 'assistant', content: a.content });
      }
    }
    parsed.history = verified;
    const userText = actionText(parsed.action, parsed);
    const sign = (text) => signTurn(secret, httpReq.user.id, parsed.scope, userText, text);

    const catalog = catalogAnswer(parsed);
    if (!catalog && !providers.length) {
      // Без ИИ свободный диалог недоступен — попытку не списываем.
      const send = sse(res);
      send('meta', { mode: 'demo', access: access.status(httpReq.user) });
      await streamText(send, DEMO_NOTE, () => res.writableEnded);
      send('done', { demo: true });
      return res.end();
    }

    const uid = httpReq.user?.id;
    if (uid && inflight.has(uid)) {
      return res.status(429).json({ error: reasonText('busy'), reason: 'busy' });
    }
    const grant = access.consume(httpReq.user, parsed.scope, { startTrial: parsed.startTrial, ip: httpReq.ip });
    if (!grant.ok) {
      return res.status(grant.status).json({ error: reasonText(grant.reason), reason: grant.reason, access: access.status(httpReq.user) });
    }
    if (!catalog && grant.mode === 'trial' && !access.consumeTrialAiBudget()) {
      access.refund(httpReq.user, grant.mode);
      return res.status(503).json({ error: reasonText('trial_budget'), reason: 'trial_budget' });
    }

    inflight.add(uid);
    res.on('close', () => inflight.delete(uid));
    const send = sse(res);
    let closed = false;
    res.on('close', () => { closed = true; });
    send('meta', { mode: grant.mode, source: catalog ? 'catalog' : 'ai', access: access.status(httpReq.user) });

    if (catalog) {
      await streamText(send, catalog, () => closed);
      inflight.delete(uid);
      if (!closed) { send('done', { sig: sign(catalog) }); res.end(); }
      return;
    }

    const ping = setInterval(() => { if (!closed) res.write(': ping\n\n'); }, 15000);
    const controller = new AbortController();
    res.on('close', () => { if (!res.writableFinished) controller.abort(); });
    let delivered = 0;
    let answer = '';
    try {
      const result = await askAi({
        parsed,
        signal: controller.signal,
        onText: (delta) => {
          delivered += delta.length;
          answer += delta;
          if (!closed) send('delta', { t: delta });
        },
      });
      if (result.stop === 'refusal') {
        if (delivered === 0) access.refund(httpReq.user, grant.mode);
        if (!closed) send('refusal', { error: 'Наставник не может ответить на этот запрос. Переформулируй вопрос по учебной теме.' });
      } else if (!closed) {
        send('done', {
          truncated: result.stop === 'max_tokens',
          provider: result.provider,
          sig: answer && answer.length <= MAX_ASSISTANT_MSG ? sign(answer) : null,
        });
      }
    } catch (err) {
      // Обрыв соединения клиентом попытку не возвращает: модель уже работала и тратила токены.
      if (!closed) {
        if (delivered === 0) access.refund(httpReq.user, grant.mode);
        if (err?.name !== 'AbortError') log.error('[tutor] ИИ не ответил:', err?.message ?? err);
        const busy = err instanceof ProviderError && err.busy;
        send('error', {
          error: busy
            ? `Наставник сейчас перегружен. Попробуй через минуту${delivered === 0 ? ' — попытка не списана' : ''}.`
            : `Не получилось получить ответ наставника${delivered === 0 ? ' — попытка не списана' : ''}. Попробуй ещё раз.`,
        });
      }
    } finally {
      inflight.delete(uid);
      clearInterval(ping);
      if (!res.writableEnded) res.end();
    }
  }

  return {
    handle,
    aiEnabled: providers.length > 0,
    providers: providers.map((p) => ({ id: p.id, ...PROVIDER_INFO[p.id] })),
  };
}

export function reasonText(reason) {
  switch (reason) {
    case 'auth': return 'Войди, чтобы пользоваться наставником';
    case 'trial_available': return 'Можно использовать бесплатный разбор этой недели';
    case 'trial_used': return 'Бесплатный разбор этой недели уже использован для другой задачи';
    case 'trial_exhausted': return 'Сообщения бесплатного разбора закончились';
    case 'daily_limit': return 'Дневной лимит сообщений исчерпан, продолжим завтра';
    case 'busy': return 'Дождись ответа на предыдущий вопрос';
    case 'trial_ip_limit': return 'Из этой сети на этой неделе уже взяли много бесплатных разборов. Попробуй позже или подключи «Отличника»';
    case 'trial_budget': return 'Бесплатные разборы с ИИ на сегодня закончились — загляни завтра или подключи «Отличника»';
    case 'bad_scope': return 'Некорректный запрос';
    default: return 'Доступ закрыт';
  }
}
