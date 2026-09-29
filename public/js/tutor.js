// Сессия с наставником: журнал сообщений, потоковая печать, пробная попытка и пейволл.
import { h, clear, storage, formatDate } from './dom.js';
import { tutorStream, ApiError } from './api.js';
import { store, setAccess } from './store.js';
import { md, setMd } from './render.js';
import { openAuth, confirmTrial, paywall, toast } from './ui.js';

const MAX_HISTORY = 16;
const MAX_USER_MSG = 8000;
const MAX_ASSISTANT_MSG = 24000;
const MAX_TOTAL = 88000;
const session = storage('session');

const USER_TEXT = {
  hint: (n) => `Дай подсказку №${n} к этой задаче. Только следующий шаг, без ответа.`,
  solution: () => 'Покажи полное решение этой задачи со всеми объяснениями.',
};
const USER_LABEL = {
  hint: (n) => `💡 Подсказка ${n}`,
  solution: () => '📘 Полное решение со всеми объяснениями',
};

/** «Наставник · GigaChat» — какой ИИ ответил. */
function whoLabel(via) {
  const title = (store.config.aiProviders ?? []).find((p) => p.id === via)?.title;
  return title ? `Наставник · ${title}` : 'Наставник';
}

export function newChatScope() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return 'chat:' + Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 20);
}

/**
 * @param {{scope: string, subjectId?: string, taskId?: string, mode?: string, onChange?: Function}} opts
 */
export function createTutorSession(opts) {
  const key = `tutor:${opts.scope}`;
  let log = session.get(key) ?? []; // {role: 'user'|'assistant'|'note', content, label?, action?}
  let busy = false;
  let controller = null;
  const logEl = h('div', { class: 'tutor__log', 'aria-live': 'polite' });

  const save = () => session.set(key, log.filter((m) => m.role !== 'pending').slice(-40));
  const notify = () => opts.onChange?.(api);

  function renderMessage(m) {
    if (m.role === 'user') {
      return h('div', { class: 'msg msg--user' }, h('span', { class: 'label msg__who', text: 'Ты' }), m.label ?? m.content);
    }
    const box = h('div', { class: `msg msg--tutor ${m.role === 'note' ? 'msg--note' : ''}` }, h('span', { class: 'label msg__who', text: m.role === 'note' ? 'Сообщение' : whoLabel(m.via) }));
    box.append(md(m.content));
    return box;
  }

  function renderAll() {
    clear(logEl);
    for (const m of log) logEl.append(renderMessage(m));
  }

  // В историю идут только пары «вопрос — ответ наставника» с подписью сервера.
  function history() {
    const turns = [];
    for (let i = 0; i < log.length; i++) {
      const m = log[i];
      const next = log[i + 1];
      if (m.role === 'user' && next?.role === 'assistant') {
        if (next.sig && m.content.length <= MAX_USER_MSG && next.content.length <= MAX_ASSISTANT_MSG) {
          turns.push({ role: 'user', content: m.content });
          turns.push({ role: 'assistant', content: next.content, sig: next.sig });
        }
        i++;
      }
    }
    let out = turns.slice(-MAX_HISTORY);
    while (out.length && out.reduce((n, t) => n + t.content.length, 0) > MAX_TOTAL) out = out.slice(2);
    return out;
  }

  function hintsAsked() {
    return log.filter((m) => m.role === 'user' && m.action === 'hint').length;
  }

  async function ask(action, { question = '', startTrial = false } = {}) {
    if (busy) return;
    if (!store.user) {
      const ok = await openAuth('register');
      if (!ok) return;
    }
    const hintLevel = action === 'hint' ? hintsAsked() + 1 : undefined;
    const content = action === 'chat' ? question : USER_TEXT[action](hintLevel);
    const label = action === 'chat' ? null : USER_LABEL[action](hintLevel);
    const body = {
      scope: opts.scope,
      action,
      subjectId: opts.subjectId ?? 'any',
      taskId: opts.taskId,
      mode: opts.mode,
      hintLevel,
      question: action === 'chat' ? question : undefined,
      history: history(),
      startTrial,
    };

    busy = true;
    notify();
    const userMsg = { role: 'user', content, label, action };
    const userEl = renderMessage(userMsg);
    const out = h('div', { class: 'prose' }, h('span', { class: 'thinking' }, h('i'), h('i'), h('i'), ' наставник думает'));
    const tutorEl = h('div', { class: 'msg msg--tutor' }, h('span', { class: 'label msg__who', text: 'Наставник' }), out);
    logEl.append(userEl, tutorEl);
    tutorEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    let text = '';
    let frame = 0;
    let failed = null;
    let demo = false;
    let sig = null;
    let via = null;
    const paint = () => { frame = 0; setMd(out, text, { final: false }); };
    controller = new AbortController();
    try {
      await tutorStream(body, {
        signal: controller.signal,
        onMeta: (meta) => { setAccess(meta.access); demo = meta.mode === 'demo'; },
        onDelta: (t) => { text += t; if (!frame) frame = requestAnimationFrame(paint); },
        onDone: (data) => {
          sig = typeof data?.sig === 'string' ? data.sig : null;
          via = typeof data?.provider === 'string' ? data.provider : null;
          if (via) tutorEl.querySelector('.msg__who').textContent = whoLabel(via);
        },
        onError: (message) => { failed = message; },
      });
    } catch (err) {
      userEl.remove();
      tutorEl.remove();
      busy = false;
      controller = null;
      notify();
      if (err instanceof ApiError) {
        const reason = err.data?.reason;
        if (err.data?.access) setAccess(err.data.access);
        if (err.status === 401) { if (await openAuth('login')) return ask(action, { question }); return; }
        if (reason === 'trial_available') { if (await confirmTrial()) return ask(action, { question, startTrial: true }); return; }
        if (['trial_used', 'trial_exhausted', 'daily_limit'].includes(reason)) { paywall(reason); return; }
        toast(err.message);
        return;
      }
      toast('Не получилось связаться с наставником');
      return;
    }
    if (frame) cancelAnimationFrame(frame);
    controller = null;
    busy = false;

    if (failed && !text) {
      setMd(out, `⚠️ ${failed}`);
      tutorEl.classList.add('msg--note');
    } else if (failed) {
      setMd(out, text + `\n\n> ⚠️ ${failed}`);
      log.push(userMsg, { role: 'note', content: text });
      save();
    } else {
      setMd(out, text);
      if (demo) {
        log.push(userMsg, { role: 'note', content: text });
      } else {
        log.push(userMsg, { role: 'assistant', content: text, sig, via });
      }
      save();
    }
    notify();
  }

  function reset() {
    controller?.abort();
    log = [];
    session.remove(key);
    busy = false;
    renderAll();
    notify();
  }

  renderAll();

  const api = {
    el: logEl,
    ask,
    reset,
    get busy() { return busy; },
    get hintsAsked() { return hintsAsked(); },
    get hasSolution() { return log.some((m) => m.role === 'user' && m.action === 'solution'); },
    get isEmpty() { return log.length === 0; },
  };
  return api;
}

/** Строка статуса доступа над панелью наставника. */
export function accessLine(scope) {
  const a = store.access;
  const n = store.config.trialMessages;
  if (!store.user) return h('p', { class: 'caption' }, 'Войди — и получишь 1 бесплатный разбор в неделю.');
  if (a.plan === 'pro') return h('p', { class: 'caption' }, `★ «Отличник» — наставник без ограничений.`);
  if (a.trial?.available) return h('p', { class: 'caption' }, `Доступен бесплатный разбор недели: до ${n} сообщений по одной задаче.`);
  if (a.trial?.scope !== scope) {
    return h('p', { class: 'caption' }, `Бесплатный разбор этой недели уже использован. Следующий — ${formatDate(a.trial?.nextResetAt ?? Date.now())}, или подключи «Отличника».`);
  }
  const left = a.trial?.messagesLeft ?? 0;
  const meter = h('div', { class: 'trial-meter', 'aria-hidden': 'true' }, Array.from({ length: n }, (_, i) => h('i', { class: i < left ? 'on' : '' })));
  return h('div', { class: 'stack' }, h('p', { class: 'caption', style: { margin: 0 } }, `Разбор недели: осталось ${left} из ${n} сообщений.`), meter);
}
