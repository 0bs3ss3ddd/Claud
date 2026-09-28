import { h, clear, formatDate, go } from '../dom.js';
import { api, ApiError } from '../api.js';
import { store, refreshMe, setAccess } from '../store.js';
import { sticker } from '../stickers.js';
import { openAuth, toast } from '../ui.js';

function shell(title, ...children) {
  return h('section', { class: 'hero' },
    h('div', { class: 'floating sticker-a' }, sticker('coin5')),
    h('div', { class: 'floating sticker-b' }, sticker('lock')),
    h('div', { class: 'wrap hero__title' }, h('h1', { class: 'display display--md', text: title })),
    h('div', { class: 'wrap checkout', style: { position: 'relative', zIndex: 3, marginTop: '40px' } }, ...children),
  );
}

export async function demoPayView([id]) {
  document.title = `Тестовая оплата — ${store.config.brand}`;
  if (!store.user) {
    return shell('Оплата', h('div', { class: 'card card--xl stack' },
      h('p', null, 'Войди, чтобы продолжить оплату.'),
      h('button', { class: 'btn btn--primary', type: 'button', onclick: async () => { if (await openAuth('login')) go(location.pathname); } }, 'Войти'),
    ));
  }
  const pay = h('button', { class: 'btn btn--primary btn--lg btn--block', type: 'button' }, `Оплатить ${store.config.priceRub} ₽ (тест)`);
  pay.addEventListener('click', async () => {
    pay.disabled = true;
    try {
      const r = await api(`/payments/${encodeURIComponent(id)}/demo-confirm`, { method: 'POST', body: {} });
      setAccess(r.access);
      go(`/payment/return?id=${encodeURIComponent(id)}`);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Ошибка оплаты');
      pay.disabled = false;
    }
  });
  return shell('Оплата',
    h('div', { class: 'card card--xl stack' },
      h('span', { class: 'pill pill--dark' }, 'демо-режим'),
      h('p', null, 'Платёжная система ещё не подключена администратором, поэтому это тестовая оплата: деньги не списываются, а тариф включается сразу. В боевом режиме здесь откроется защищённая страница ЮKassa.'),
      h('dl', { class: 'kv' },
        h('dt', null, 'Тариф'), h('dd', null, '«Отличник»'),
        h('dt', null, 'Срок'), h('dd', null, `${store.config.periodDays} дней`),
        h('dt', null, 'Сумма'), h('dd', null, `${store.config.priceRub} ₽`),
        h('dt', null, 'Аккаунт'), h('dd', null, store.user.email),
      ),
      pay,
      h('a', { class: 'btn btn--block', href: '/pricing' }, 'Отмена'),
    ),
  );
}

export async function paymentReturnView(_params, query) {
  document.title = `Оплата — ${store.config.brand}`;
  const id = query.get('id') ?? '';
  const box = h('div', { class: 'card card--xl stack' }, h('p', { class: 'label' }, 'Проверяем оплату…'));
  const view = shell('Оплата', box);
  if (!store.user) {
    clear(box).append(h('p', null, 'Войди в аккаунт, с которого оплачивал, чтобы увидеть статус.'), h('button', { class: 'btn btn--primary', type: 'button', onclick: async () => { if (await openAuth('login')) go(location.pathname + location.search); } }, 'Войти'));
    return view;
  }
  let tries = 0;
  const poll = async () => {
    if (!document.body.contains(box) && tries > 0) return;
    tries++;
    try {
      const { payment, access } = await api(`/payments/${encodeURIComponent(id)}`);
      setAccess(access);
      if (payment.status === 'succeeded') {
        await refreshMe();
        clear(box).append(
          h('div', { style: { width: '110px' } }, sticker('medal')),
          h('h2', { class: 'display display--sm', text: 'Ты — отличник!' }),
          h('p', null, `Наставник открыт до ${formatDate(store.access.proUntil, true)}. Подсказки, полные разборы и Решатель — без недельного лимита.`),
          h('div', { class: 'row' }, h('a', { class: 'btn btn--primary btn--lg', href: '/solver' }, 'Открыть Решатель'), h('a', { class: 'btn btn--lg', href: '/subjects' }, 'К задачам')),
        );
        return;
      }
      if (payment.status === 'canceled' || payment.status === 'failed') {
        clear(box).append(h('h2', { class: 'heading-sm', text: 'Платёж не прошёл' }), h('p', null, 'Деньги не списаны. Можно попробовать ещё раз.'), h('a', { class: 'btn btn--primary', href: '/pricing' }, 'К тарифам'));
        return;
      }
      clear(box).append(h('h2', { class: 'heading-sm', text: 'Ждём подтверждения банка' }), h('p', null, 'Обычно это занимает несколько секунд. Страница обновится сама.'), h('span', { class: 'thinking' }, h('i'), h('i'), h('i')));
      if (tries < 40) setTimeout(poll, 3000);
      else clear(box).append(h('p', null, 'Банк отвечает дольше обычного. Статус появится в личном кабинете, как только платёж подтвердится.'), h('a', { class: 'btn btn--primary', href: '/account' }, 'В кабинет'));
    } catch (err) {
      clear(box).append(h('p', null, err instanceof ApiError && err.status === 404 ? 'Платёж не найден.' : 'Не удалось проверить оплату.'), h('a', { class: 'btn', href: '/account' }, 'В кабинет'));
    }
  };
  poll();
  return view;
}
