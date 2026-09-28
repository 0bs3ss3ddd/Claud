// Модальные окна, уведомления, окно входа и пейволл.
import { h, clear, formatDate } from './dom.js';
import { api, ApiError } from './api.js';
import { store, refreshMe } from './store.js';
import { sticker } from './stickers.js';

let toastZone = null;
export function toast(message, ms = 3600) {
  toastZone ??= document.body.appendChild(h('div', { class: 'toast-zone', role: 'status', 'aria-live': 'polite' }));
  const el = h('div', { class: 'toast', text: message });
  toastZone.append(el);
  setTimeout(() => el.remove(), ms);
}

export function openModal(build, { label = 'Диалог' } = {}) {
  const prevFocus = document.activeElement;
  let closeResolve;
  const done = new Promise((r) => { closeResolve = r; });
  const close = (value) => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
    prevFocus?.focus?.();
    closeResolve(value);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(null); };
  const modal = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': label });
  const backdrop = h('div', { class: 'modal-backdrop', onclick: (e) => { if (e.target === backdrop) close(null); } }, modal);
  modal.append(h('button', { class: 'btn btn--sm modal__close', type: 'button', 'aria-label': 'Закрыть', onclick: () => close(null) }, '✕'));
  modal.append(build(close));
  document.body.append(backdrop);
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', onKey);
  setTimeout(() => modal.querySelector('input, button:not(.modal__close), a')?.focus(), 30);
  return done;
}

/** Форма входа/регистрации. onSuccess вызывается после входа. */
export function authForm({ initial = 'login', onSuccess } = {}) {
  let mode = initial;
  const root = h('div', { class: 'stack' });
  const render = () => {
    clear(root);
    const error = h('div', { class: 'form-error', role: 'alert', hidden: true });
    const tabs = h('div', { class: 'tabs', role: 'tablist' },
      h('button', { type: 'button', role: 'tab', 'aria-selected': String(mode === 'login'), onclick: () => { mode = 'login'; render(); } }, 'Вход'),
      h('button', { type: 'button', role: 'tab', 'aria-selected': String(mode === 'register'), onclick: () => { mode = 'register'; render(); } }, 'Регистрация'),
    );
    const name = h('input', { class: 'input', name: 'name', autocomplete: 'given-name', maxlength: 60, required: true });
    const email = h('input', { class: 'input', name: 'email', type: 'email', autocomplete: 'email', maxlength: 254, required: true });
    const password = h('input', { class: 'input', name: 'password', type: 'password', autocomplete: mode === 'login' ? 'current-password' : 'new-password', minlength: 8, maxlength: 128, required: true });
    const submit = h('button', { class: 'btn btn--primary btn--lg btn--block', type: 'submit' }, mode === 'login' ? 'Войти' : 'Создать аккаунт');
    const form = h('form', {
      class: 'stack',
      novalidate: true,
      onsubmit: async (e) => {
        e.preventDefault();
        error.hidden = true;
        submit.disabled = true;
        try {
          const body = { email: email.value, password: password.value };
          if (mode === 'register') body.name = name.value;
          await api(mode === 'login' ? '/auth/login' : '/auth/register', { method: 'POST', body });
          await refreshMe();
          onSuccess?.();
        } catch (err) {
          error.textContent = err instanceof ApiError ? err.message : 'Не получилось. Попробуй ещё раз.';
          error.hidden = false;
        } finally {
          submit.disabled = false;
        }
      },
    },
      mode === 'register' ? h('label', { class: 'field' }, h('span', null, 'Имя'), name) : null,
      h('label', { class: 'field' }, h('span', null, 'Email'), email),
      h('label', { class: 'field' }, h('span', null, 'Пароль'), password),
      error,
      submit,
      mode === 'register'
        ? h('p', { class: 'caption muted' }, 'Регистрируясь, ты соглашаешься с ', h('a', { href: '/terms', 'data-link': true }, 'офертой'), ' и ', h('a', { href: '/privacy', 'data-link': true }, 'политикой конфиденциальности'), '.')
        : null,
    );
    root.append(tabs, form);
  };
  render();
  return root;
}

export function openAuth(initial = 'login') {
  return openModal((close) => h('div', null,
    h('h2', { class: 'display', text: initial === 'login' ? 'Вход' : 'Привет!' }),
    h('p', { class: 'muted' }, 'Аккаунт нужен, чтобы получать бесплатный разбор недели и подключить «Отличника».'),
    authForm({ initial, onSuccess: () => { toast(`Готово, ${store.user?.name ?? 'ты в системе'}!`); close(true); } }),
  ), { label: 'Вход' });
}

/** Подтверждение бесплатной попытки недели. */
export function confirmTrial() {
  const n = store.config.trialMessages;
  return openModal((close) => h('div', { class: 'stack' },
    h('div', { style: { width: '84px' } }, sticker('star')),
    h('h2', { class: 'display', text: 'Разбор недели' }),
    h('p', null, `Бесплатный наставник откроется для этой задачи: подсказки, полное решение и вопросы — до ${n} сообщений.`),
    h('p', { class: 'muted' }, `Следующий бесплатный разбор — ${formatDate(store.access?.trial?.nextResetAt ?? Date.now())}. Без ограничений — в тарифе «Отличник» за ${store.config.priceRub} ₽.`),
    h('div', { class: 'row' },
      h('button', { class: 'btn btn--primary btn--lg', type: 'button', onclick: () => close(true) }, 'Использовать'),
      h('a', { class: 'btn btn--lg', href: '/pricing', 'data-link': true, onclick: () => close(false) }, 'Тарифы'),
    ),
  ), { label: 'Бесплатный разбор недели' });
}

/** Пейволл после исчерпания пробной попытки. */
export function paywall(reason) {
  const title = reason === 'daily_limit' ? 'Лимит на сегодня' : 'Нужен «Отличник»';
  const text = {
    trial_used: `Бесплатный разбор этой недели уже потрачен на другую задачу. Следующий откроется ${formatDate(store.access?.trial?.nextResetAt ?? Date.now())}.`,
    trial_exhausted: 'Сообщения бесплатного разбора закончились.',
    daily_limit: 'Ты задал наставнику очень много вопросов за сегодня. Лимит обновится в полночь по Москве.',
  }[reason] ?? 'Наставник доступен в тарифе «Отличник».';
  return openModal((close) => h('div', { class: 'stack' },
    h('div', { style: { width: '84px' } }, sticker('lock')),
    h('h2', { class: 'display', text: title }),
    h('p', null, text),
    reason !== 'daily_limit'
      ? h('p', { class: 'muted' }, `«Отличник» — ${store.config.priceRub} ₽ за ${store.config.periodDays} дней: подсказки, полные разборы, графики, карты и картины, Решатель любых задач. Разовый платёж, без автосписаний.`)
      : null,
    reason !== 'daily_limit'
      ? h('div', { class: 'row' },
        h('a', { class: 'btn btn--primary btn--lg', href: '/pricing', 'data-link': true, onclick: () => close(true) }, `Подключить за ${store.config.priceRub} ₽`),
        h('button', { class: 'btn btn--lg', type: 'button', onclick: () => close(false) }, 'Позже'),
      )
      : h('button', { class: 'btn btn--primary', type: 'button', onclick: () => close(false) }, 'Понятно'),
  ), { label: title });
}

export function planChip() {
  const a = store.access;
  if (a?.plan === 'pro') return h('span', { class: 'pill pill--dark' }, '★ Отличник');
  if (a?.plan === 'free') return h('span', { class: 'pill' }, a.trial?.available ? '1 разбор доступен' : 'Ученик');
  return null;
}
