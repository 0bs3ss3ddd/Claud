// Точка входа: шапка, подвал и клиентский роутер.
import { h, clear } from './dom.js';
import { store, loadConfig, refreshMe, onChange, getSubjects } from './store.js';
import { planChip, openAuth } from './ui.js';
import { homeView } from './views/home.js';
import { subjectsView, olympiadsView } from './views/catalog.js';
import { subjectView } from './views/subject.js';
import { taskView } from './views/task.js';
import { solverView } from './views/solver.js';
import { pricingView } from './views/pricing.js';
import { accountView } from './views/account.js';
import { demoPayView, paymentReturnView } from './views/payment.js';
import { termsView, privacyView } from './views/legal.js';

const routes = [
  [/^\/$/, homeView],
  [/^\/subjects\/?$/, subjectsView],
  [/^\/subject\/([a-z0-9]{2,16})\/?$/, subjectView],
  [/^\/task\/([a-z0-9]{2,16})\/([a-z0-9]{2,16})\/?$/, taskView],
  [/^\/solver\/?$/, solverView],
  [/^\/olympiads\/?$/, olympiadsView],
  [/^\/pricing\/?$/, pricingView],
  [/^\/account\/?$/, accountView],
  [/^\/pay\/demo\/([0-9a-f-]{36})\/?$/, demoPayView],
  [/^\/payment\/return\/?$/, paymentReturnView],
  [/^\/terms\/?$/, termsView],
  [/^\/privacy\/?$/, privacyView],
];

const NAV = [
  ['/subjects', 'Предметы'],
  ['/olympiads', 'Олимпиады'],
  ['/solver', 'Решатель'],
  ['/pricing', 'Тарифы'],
];

const main = document.getElementById('main');
let renderToken = 0;

function marquee() {
  const items = ['ЕГЭ по 12 предметам', 'ВсОШ и олимпиады РСОШ', 'Материалы и решения — бесплатно', '1 разбор с наставником в неделю — даром', '«Отличник» — 499 ₽ за 30 дней', 'Графики, карты и картины в каждом разборе'];
  const run = () => items.map((t) => h('span', null, t));
  return h('div', { class: 'marquee', 'aria-hidden': 'true' }, h('div', { class: 'marquee__track' }, run(), run()));
}

function headerActions() {
  const box = h('div', { class: 'header-actions' });
  const renderActions = () => {
    clear(box);
    const chip = planChip();
    if (chip) box.append(h('a', { href: '/account', class: 'plan-chip', 'data-link': true, style: { textDecoration: 'none' } }, chip));
    if (store.user) {
      box.append(h('a', { class: 'btn btn--primary', href: '/account' }, store.user.name.slice(0, 16)));
    } else {
      box.append(h('button', { class: 'btn btn--primary', type: 'button', onclick: () => openAuth('login') }, 'Войти'));
    }
    box.append(h('button', { class: 'plus-btn', type: 'button', 'aria-label': 'Меню', 'aria-expanded': 'false', onclick: openMenu }, '+'));
  };
  onChange(renderActions);
  renderActions();
  return box;
}

let menuEl = null;
function openMenu() {
  menuEl?.remove();
  const close = () => { menuEl?.remove(); menuEl = null; document.body.style.overflow = ''; };
  menuEl = h('div', { class: 'mobile-menu is-open', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Меню' },
    h('div', { class: 'mobile-menu__top' },
      h('a', { class: 'logo', href: '/', onclick: close }, h('span', { class: 'logo__mark' }, 'П'), store.config.brand),
      h('button', { class: 'plus-btn', type: 'button', 'aria-label': 'Закрыть меню', style: { display: 'inline-grid', transform: 'rotate(45deg)' }, onclick: close }, '+'),
    ),
    [['/', 'Главная'], ...NAV, ['/account', store.user ? 'Кабинет' : 'Войти']].map(([href, label]) => h('a', { class: 'big', href, onclick: close }, label)),
  );
  document.body.append(menuEl);
  document.body.style.overflow = 'hidden';
  menuEl.querySelector('a.big')?.focus();
  menuEl.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

function header() {
  const nav = h('nav', { class: 'nav', 'aria-label': 'Основное меню' }, NAV.map(([href, label]) => h('a', { href }, label)));
  return h('header', { class: 'site-header' },
    h('div', { class: 'wrap' },
      h('a', { class: 'logo', href: '/', 'aria-label': `${store.config.brand} — на главную` }, h('span', { class: 'logo__mark', 'aria-hidden': 'true' }, 'П'), store.config.brand),
      nav,
      headerActions(),
    ),
  );
}

async function footer() {
  let subjects = [];
  try { subjects = await getSubjects(); } catch { /* пусто */ }
  const col = (title, links) => h('div', null, h('h4', { text: title }), h('ul', null, links.map(([href, label, ext]) => h('li', null, h('a', ext ? { href, target: '_blank', rel: 'noopener noreferrer' } : { href }, label)))));
  return h('footer', { class: 'site-footer' },
    h('div', { class: 'wrap' },
      h('div', { class: 'footer-grid' },
        col('Предметы', subjects.slice(0, 7).map((s) => [`/subject/${s.id}`, s.name])),
        col('Ещё предметы', subjects.slice(7).map((s) => [`/subject/${s.id}`, s.name])),
        col('Сервис', [['/solver', 'Решатель ЕГЭ'], ['/olympiads', 'ВсОШ и РСОШ'], ['/pricing', 'Тарифы'], ['/account', 'Личный кабинет']]),
        col('Источники', [
          ['https://ege.sdamgia.ru/prob_catalog', 'Решу ЕГЭ — каталог заданий', true],
          ['https://mathus.ru/', 'MathUs — олимпиады', true],
          ['https://fipi.ru/', 'ФИПИ', true],
          ['https://rsr-olymp.ru/', 'Совет олимпиад (РСОШ)', true],
        ]),
        col('Документы', [['/terms', 'Публичная оферта'], ['/privacy', 'Политика конфиденциальности']]),
      ),
      h('p', { class: 'footer-note' }, `Задания ЕГЭ — по материалам открытого каталога «Решу ЕГЭ» (sdamgia.ru) и демоверсий ФИПИ; олимпиадные материалы — MathUs.ru (И. В. Яковлев), архивы ВсОШ и олимпиад РСОШ. ${store.config.brand} не связана с ФИПИ, Минпросвещения и организаторами олимпиад. © ${new Date().getFullYear()}`),
      h('div', { class: 'footer-word', 'aria-hidden': 'true' }, store.config.brand.slice(0, -1), h('span', null, store.config.brand.slice(-1))),
    ),
  );
}

function markNav(path) {
  document.querySelectorAll('.nav a').forEach((a) => {
    const active = path === a.getAttribute('href') || path.startsWith(a.getAttribute('href') + '/') || (a.getAttribute('href') === '/subjects' && /^\/(subject|task)\//.test(path));
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

async function render() {
  const token = ++renderToken;
  const url = new URL(location.href);
  const path = url.pathname;
  markNav(path);
  let view = null;
  let params = [];
  for (const [re, fn] of routes) {
    const m = path.match(re);
    if (m) { view = fn; params = m.slice(1); break; }
  }
  let node;
  try {
    node = view ? await view(params, url.searchParams) : notFound();
  } catch (err) {
    console.error(err);
    node = err?.status === 404 ? notFound() : errorView(err);
  }
  if (token !== renderToken) return;
  clear(main).append(node);
  if (url.hash) document.getElementById(url.hash.slice(1))?.scrollIntoView();
}

function notFound() {
  document.title = `Не найдено — ${store.config.brand}`;
  return h('section', { class: 'band bg-sky' }, h('div', { class: 'wrap empty' },
    h('h1', { class: 'display display--lg', text: '404' }),
    h('p', { class: 'tagline', style: { margin: '24px auto' } }, 'Такой страницы нет. Зато есть 12 предметов и наставник.'),
    h('a', { class: 'btn btn--primary btn--lg', href: '/subjects' }, 'К предметам'),
  ));
}

function errorView(err) {
  return h('section', { class: 'band' }, h('div', { class: 'wrap empty' },
    h('h1', { class: 'display display--md', text: 'Упс' }),
    h('p', { class: 'tagline', style: { margin: '24px auto' } }, err?.message || 'Что-то пошло не так.'),
    h('button', { class: 'btn btn--primary', type: 'button', onclick: () => render() }, 'Попробовать снова'),
  ));
}

export function navigate(to, { replace = false } = {}) {
  const url = new URL(to, location.href);
  if (url.origin !== location.origin) { location.href = url.href; return; }
  const samePage = url.pathname === location.pathname && url.search === location.search;
  if (replace) history.replaceState(null, '', url);
  else history.pushState(null, '', url);
  if (samePage && url.hash) {
    document.getElementById(url.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  render().then(() => { if (!url.hash) window.scrollTo(0, 0); main.focus({ preventScroll: true }); });
}
window.addEventListener('parta:navigate', (e) => navigate(e.detail));

document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest('a[href]');
  if (!a || a.target || a.hasAttribute('download')) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.preventDefault();
  navigate(url.pathname + url.search + url.hash);
});
window.addEventListener('popstate', () => render());

(async function boot() {
  await Promise.all([loadConfig(), refreshMe()]);
  document.getElementById('top').replaceWith(marquee(), header());
  await render();
  document.getElementById('bottom').replaceWith(await footer());
})();
