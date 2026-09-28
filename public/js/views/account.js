import { h, clear, formatDate, go } from '../dom.js';
import { api } from '../api.js';
import { store, refreshMe, onChange } from '../store.js';
import { sticker } from '../stickers.js';
import { authForm, toast } from '../ui.js';

const STATUS = { pending: 'ожидает оплаты', succeeded: 'оплачен', canceled: 'отменён', failed: 'не создан' };

export async function accountView() {
  document.title = `Кабинет — ${store.config.brand}`;
  const root = h('div');
  const render = async () => {
    clear(root);
    if (!store.user) {
      root.append(h('section', { class: 'hero' },
        h('div', { class: 'floating sticker-a' }, sticker('pencil')),
        h('div', { class: 'floating sticker-b' }, sticker('star')),
        h('div', { class: 'wrap hero__title' }, h('h1', { class: 'display display--lg', text: 'Кабинет' })),
        h('div', { class: 'wrap', style: { maxWidth: '520px', position: 'relative', zIndex: 3, marginTop: '40px' } },
          h('div', { class: 'card card--xl' }, authForm({ onSuccess: () => { toast('Добро пожаловать!'); render(); } })),
        ),
      ));
      return;
    }
    const a = store.access;
    let payments = [];
    try { payments = (await api('/payments')).payments; } catch { /* пусто */ }
    const pro = a.plan === 'pro';
    root.append(
      h('section', { class: 'hero' },
        h('div', { class: 'floating sticker-b' }, sticker(pro ? 'medal' : 'book')),
        h('div', { class: 'wrap hero__title' },
          h('span', { class: 'pill', style: { position: 'relative', zIndex: 3, marginBottom: '16px' } }, store.user.email),
          h('h1', { class: 'display display--md', text: `Привет, ${store.user.name}` }),
        ),
      ),
      h('section', { class: 'band' }, h('div', { class: 'wrap grid grid--3' },
        h('article', { class: `card card--xl stack ${pro ? 'bg-violet' : 'bg-white'}` },
          h('span', { class: 'label' }, 'Тариф'),
          h('div', { class: 'plan__name', text: pro ? 'Отличник' : 'Ученик' }),
          pro
            ? h('p', null, `Наставник без недельного лимита до ${formatDate(a.proUntil, true)}. Сегодня: ${a.daily?.used ?? 0} из ${a.daily?.limit ?? '—'} сообщений.`)
            : h('p', null, `Все материалы бесплатно + 1 разбор с наставником в неделю. «Отличник» — ${store.config.priceRub} ₽ за ${store.config.periodDays} дней.`),
          h('a', { class: `btn ${pro ? '' : 'btn--primary'}`, href: '/pricing' }, pro ? 'Продлить' : 'Стать отличником'),
        ),
        h('article', { class: 'card card--xl stack bg-sun' },
          h('span', { class: 'label' }, 'Разбор недели'),
          pro
            ? h('p', null, 'С «Отличником» недельное ограничение не действует.')
            : a.trial?.available
              ? h('p', null, `Доступен! Открой наставника на любой задаче — до ${a.trial.messagesTotal} сообщений.`)
              : h('p', null, `Использован: осталось ${a.trial?.messagesLeft ?? 0} из ${a.trial?.messagesTotal} сообщений для выбранной задачи.`),
          h('p', { class: 'caption' }, `Обновление: ${formatDate(a.trial?.nextResetAt ?? Date.now(), true)} (по Москве)`),
          h('a', { class: 'btn', href: '/subjects' }, 'К задачам'),
        ),
        h('article', { class: 'card card--xl stack bg-sky' },
          h('span', { class: 'label' }, 'Безопасность'),
          h('p', null, 'Сессия хранится в защищённом cookie. Вышел не на своём устройстве? Заверши остальные сессии.'),
          h('div', { class: 'row' },
            h('button', { class: 'btn', type: 'button', onclick: async () => { await api('/auth/logout-others', { method: 'POST', body: {} }); toast('Остальные сессии завершены'); } }, 'Выйти на других'),
            h('button', { class: 'btn btn--primary', type: 'button', onclick: async () => { await api('/auth/logout', { method: 'POST', body: {} }); await refreshMe(); go('/'); } }, 'Выйти'),
          ),
        ),
      )),
      h('section', { class: 'band band--tight bg-gray' }, h('div', { class: 'wrap stack' },
        h('h2', { class: 'display display--sm', text: 'Платежи' }),
        payments.length
          ? h('div', { style: { overflowX: 'auto' } }, h('table', { class: 'compare' },
            h('thead', null, h('tr', null, h('th', null, 'Дата'), h('th', null, 'Сумма'), h('th', null, 'Статус'))),
            h('tbody', null, payments.map((p) => h('tr', null,
              h('td', null, formatDate(p.createdAt, true)),
              h('td', null, `${p.amount} ₽${p.provider === 'demo' ? ' (тест)' : ''}`),
              h('td', null, STATUS[p.status] ?? p.status),
            ))),
          ))
          : h('p', null, 'Платежей пока нет.'),
      )),
    );
  };
  const off = onChange(() => { if (!document.body.contains(root)) { off(); } });
  await render();
  return root;
}
