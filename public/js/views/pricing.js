import { h, go } from '../dom.js';
import { api, ApiError } from '../api.js';
import { store } from '../store.js';
import { sticker, ribbon } from '../stickers.js';
import { openAuth, toast } from '../ui.js';

export async function startCheckout(button) {
  if (!store.user) {
    const ok = await openAuth('register');
    if (!ok) return;
  }
  if (button) button.disabled = true;
  try {
    const { confirmationUrl } = await api('/payments', { method: 'POST', body: {} });
    if (typeof confirmationUrl !== 'string') throw new Error('Нет ссылки на оплату');
    if (confirmationUrl.startsWith('/pay/demo/')) go(confirmationUrl);
    else if (/^https:\/\/([a-z0-9-]+\.)*(yoomoney\.ru|yookassa\.ru)\//.test(confirmationUrl)) location.href = confirmationUrl;
    else throw new Error('Неожиданная ссылка на оплату');
  } catch (err) {
    toast(err instanceof ApiError ? err.message : 'Не удалось начать оплату');
  } finally {
    if (button) button.disabled = false;
  }
}

export function plansBlock() {
  const { priceRub, periodDays, trialMessages } = store.config;
  const pro = store.access?.plan === 'pro';
  const free = h('article', { class: 'card card--xl plan bg-white' },
    h('span', { class: 'label' }, 'Тариф 1'),
    h('h3', { class: 'plan__name', text: 'Ученик' }),
    h('div', { class: 'plan__price' }, '0 ₽', h('small', null, ' навсегда')),
    h('ul', null,
      h('li', null, 'Все материалы и шпаргалки по 12 предметам ЕГЭ'),
      h('li', null, 'Задачи с ответами и краткими решениями'),
      h('li', null, 'Разделы ВсОШ и РСОШ с олимпиадными задачами'),
      h('li', null, 'Ссылки на каталог «Решу ЕГЭ» и материалы MathUs'),
      h('li', null, `1 бесплатный разбор с наставником в неделю (до ${trialMessages} сообщений)`),
      h('li', { class: 'no' }, 'Решатель ЕГЭ для любых задач'),
    ),
    h('a', { class: 'btn btn--lg btn--block', href: '/subjects' }, 'Начать бесплатно'),
  );
  const buy = h('button', { class: 'btn btn--primary btn--lg btn--block', type: 'button', onclick: (e) => startCheckout(e.currentTarget) }, pro ? 'Продлить ещё на 30 дней' : `Подключить за ${priceRub} ₽`);
  const paid = h('article', { class: 'card card--xl plan plan--pro bg-violet' },
    h('div', { class: 'plan__badge', style: { width: '96px' } }, sticker('medal')),
    h('span', { class: 'label' }, 'Тариф 2'),
    h('h3', { class: 'plan__name', text: 'Отличник' }),
    h('div', { class: 'plan__price' }, `${priceRub} ₽`, h('small', null, ` / ${periodDays} дней`)),
    h('ul', null,
      h('li', null, 'Онлайн-наставник по ЕГЭ и олимпиадам без недельного лимита'),
      h('li', null, 'Подсказки по шагам — без спойлеров'),
      h('li', null, 'Полные решения со всеми объяснениями по кнопке'),
      h('li', null, 'Графики, чертежи, карты и картины прямо в разборе'),
      h('li', null, 'РЕШАТЕЛЬ ЕГЭ: вставь любую задачу — получи разбор'),
      h('li', null, 'Разовый платёж, без автосписаний'),
    ),
    buy,
    pro && store.access.proUntil ? h('p', { class: 'caption', style: { margin: 0 } }, `Активен до ${new Date(store.access.proUntil).toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' })}`) : null,
  );
  return h('div', { class: 'plans' }, free, paid);
}

export async function pricingView() {
  document.title = `Тарифы — ${store.config.brand}`;
  const { priceRub, periodDays, trialMessages } = store.config;
  const row = (label, a, b) => h('tr', null, h('td', null, label), h('td', null, a), h('td', null, b));
  return h('div', null,
    h('section', { class: 'hero' },
            h('div', { class: 'floating sticker-a' }, sticker('coin5')),
      h('div', { class: 'floating sticker-b' }, sticker('rocket')),
      h('div', { class: 'wrap hero__title' },
        ribbon('hero__ribbon', 'arc'),
        h('h1', { class: 'display display--lg', text: 'Тарифы' }),
      ),
      h('div', { class: 'wrap hero__sub' },
        h('p', { class: 'tagline' }, 'Сайт, материалы и решения — бесплатно. Если нужен личный онлайн-наставник по ЕГЭ и олимпиадам — «Отличник».'),
      ),
    ),
    h('section', { class: 'band' }, h('div', { class: 'wrap' }, plansBlock())),
    h('section', { class: 'band bg-gray' }, h('div', { class: 'wrap stack' },
      h('h2', { class: 'display display--sm', text: 'Сравнение' }),
      h('div', { style: { overflowX: 'auto' } }, h('table', { class: 'compare' },
        h('thead', null, h('tr', null, h('th', null, 'Возможность'), h('th', null, 'Ученик'), h('th', null, 'Отличник'))),
        h('tbody', null,
          row('Материалы, шпаргалки, структура экзамена', '✓', '✓'),
          row('Ответы и краткие решения задач', '✓', '✓'),
          row('Олимпиадные разделы ВсОШ и РСОШ', '✓', '✓'),
          row('Подсказки наставника', `1 задача в неделю`, 'без лимита'),
          row('Полное решение со всеми объяснениями', `1 задача в неделю`, 'без лимита'),
          row('Вопросы наставнику по задаче', `до ${trialMessages} в неделю`, 'без лимита*'),
          row('Решатель ЕГЭ — любые задачи', 'пробно', '✓'),
          row('Графики, карты, картины в объяснениях', 'пробно', '✓'),
          row('Стоимость', '0 ₽', `${priceRub} ₽ / ${periodDays} дней`),
        ),
      )),
      h('p', { class: 'caption muted' }, '* Защита от злоупотреблений: не больше 80 сообщений наставнику в сутки.'),
    )),
    h('section', { class: 'band' }, h('div', { class: 'wrap faq' },
      h('h2', { class: 'display display--sm', style: { marginBottom: '24px' }, text: 'Про оплату' }),
      faq('Как проходит оплата?', `Оплата картой, через СБП или ЮMoney на защищённой странице ЮKassa. Мы не видим и не храним данные карты. После оплаты «Отличник» включается автоматически.`),
      faq('Это подписка?', `Нет. Платёж разовый: ${priceRub} ₽ дают доступ на ${periodDays} дней. Автосписаний нет — захочешь продлить, оплатишь ещё раз, и дни добавятся к текущему сроку.`),
      faq('Что такое бесплатный разбор недели?', `Раз в неделю (обновляется в понедельник по Москве) любой зарегистрированный ученик может открыть наставника для одной задачи: подсказки, полное решение и вопросы — до ${trialMessages} сообщений.`),
      faq('Можно вернуть деньги?', 'Если наставник не заработал по нашей вине — напиши в поддержку, вернём оплату. Условия — в публичной оферте.'),
    )),
  );
}

export function faq(q, a) {
  return h('details', null, h('summary', null, q), h('div', null, h('p', null, a)));
}
