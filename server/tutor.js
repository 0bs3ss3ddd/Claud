// Наставник: подсказки, полные разборы и диалог. Ответ — поток Server-Sent Events.
//  • Подсказки и полные решения задач каталога — проверенные методистами тексты (мгновенно, без ИИ).
//  • Вопросы по задаче и «Решатель» (любая задача) — Claude API с эталоном задачи в контексте.
//  • Без ANTHROPIC_API_KEY работает демо-режим: каталог доступен, свободный диалог — нет.
import Anthropic from '@anthropic-ai/sdk';
import { TUTOR_SYSTEM_PROMPT, buildContext, actionText } from './prompts.js';
import { isValidScope } from './access.js';

const MAX_HISTORY = 16;
const MAX_MSG = 8000;
const MAX_QUESTION = 4000;
const MAX_TOTAL = 60000;
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
    if (!m || m.role !== expected || typeof m.content !== 'string' || !m.content.trim() || m.content.length > MAX_MSG) {
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

const DEMO_NOTE = `Сейчас наставник работает в **демо-режиме**: подсказки и полные разборы задач из каталога доступны, а свободный диалог с ИИ включится, когда администратор сайта подключит ключ Claude API (переменная ANTHROPIC_API_KEY).

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

export function createTutor({ config, content, access, log = console }) {
  const ai = config.anthropic.apiKey
    ? new Anthropic({ apiKey: config.anthropic.apiKey, maxRetries: 2, timeout: 10 * 60 * 1000 })
    : null;

  function buildMessages(req) {
    const context = buildContext({ subject: req.subject, task: req.task, mode: req.mode });
    const turns = [...req.history, { role: 'user', content: actionText(req.action, req) }];
    return turns.map((m, i) => {
      if (i === 0) {
        return {
          role: 'user',
          content: [
            { type: 'text', text: context },
            { type: 'text', text: m.content },
          ],
        };
      }
      return { role: m.role, content: m.content };
    });
  }

  async function handle(httpReq, res) {
    const parsed = validateTutorRequest(httpReq.body, content);
    if (parsed.error) return res.status(parsed.status ?? 400).json({ error: parsed.error });

    const catalog = catalogAnswer(parsed);
    if (!catalog && !ai) {
      // Без ИИ свободный диалог недоступен — попытку не списываем.
      const send = sse(res);
      send('meta', { mode: 'demo', access: access.status(httpReq.user) });
      await streamText(send, DEMO_NOTE, () => res.writableEnded);
      send('done', { demo: true });
      return res.end();
    }

    const grant = access.consume(httpReq.user, parsed.scope, { startTrial: parsed.startTrial });
    if (!grant.ok) {
      return res.status(grant.status).json({ error: reasonText(grant.reason), reason: grant.reason, access: access.status(httpReq.user) });
    }

    const send = sse(res);
    let closed = false;
    res.on('close', () => { closed = true; });
    send('meta', { mode: grant.mode, source: catalog ? 'catalog' : 'ai', access: access.status(httpReq.user) });

    if (catalog) {
      await streamText(send, catalog, () => closed);
      if (!closed) { send('done', {}); res.end(); }
      return;
    }

    const ping = setInterval(() => { if (!closed) res.write(': ping\n\n'); }, 15000);
    let delivered = 0;
    let stream;
    try {
      const params = {
        model: config.anthropic.model,
        max_tokens: config.anthropic.maxTokens,
        thinking: { type: 'adaptive' },
        output_config: { effort: parsed.action === 'hint' ? 'medium' : config.anthropic.effort },
        system: [{ type: 'text', text: TUTOR_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: buildMessages(parsed),
      };
      if (config.anthropic.fallbacks) {
        params.betas = ['server-side-fallback-2026-07-01'];
        params.fallbacks = 'default';
      }
      stream = ai.beta.messages.stream(params);
      res.on('close', () => { if (!res.writableFinished) stream.abort(); });
      stream.on('text', (delta) => {
        delivered += delta.length;
        if (!closed) send('delta', { t: delta });
      });
      const final = await stream.finalMessage();
      if (final.stop_reason === 'refusal') {
        access.refund(httpReq.user, grant.mode);
        if (!closed) send('refusal', { error: 'Наставник не может ответить на этот запрос. Переформулируй вопрос по учебной теме.' });
      } else if (!closed) {
        send('done', { truncated: final.stop_reason === 'max_tokens' });
      }
    } catch (err) {
      if (closed) {
        if (delivered === 0) access.refund(httpReq.user, grant.mode);
      } else {
        access.refund(httpReq.user, grant.mode);
        log.error('[tutor] ошибка Claude API:', err?.status ?? '', err?.message ?? err);
        const busy = err instanceof Anthropic.RateLimitError || (err instanceof Anthropic.APIError && Number(err.status) >= 500);
        send('error', {
          error: busy
            ? 'Наставник сейчас перегружен. Попробуй через минуту — попытка не списана.'
            : 'Не получилось получить ответ наставника. Попытка не списана, попробуй ещё раз.',
        });
      }
    } finally {
      clearInterval(ping);
      if (!res.writableEnded) res.end();
    }
  }

  return { handle, aiEnabled: Boolean(ai) };
}

export function reasonText(reason) {
  switch (reason) {
    case 'auth': return 'Войди, чтобы пользоваться наставником';
    case 'trial_available': return 'Можно использовать бесплатный разбор этой недели';
    case 'trial_used': return 'Бесплатный разбор этой недели уже использован для другой задачи';
    case 'trial_exhausted': return 'Сообщения бесплатного разбора закончились';
    case 'daily_limit': return 'Дневной лимит сообщений исчерпан, продолжим завтра';
    case 'bad_scope': return 'Некорректный запрос';
    default: return 'Доступ закрыт';
  }
}
