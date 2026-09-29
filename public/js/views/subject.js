import { h, clear } from '../dom.js';
import { store, getSubject } from '../store.js';
import { sticker, ribbon } from '../stickers.js';
import { md, plainText } from '../render.js';

const ext = { target: '_blank', rel: 'noopener noreferrer' };

export function taskCard(subject, t) {
  const badge = t.kind === 'ege' ? (t.n ? `№${t.n}` : 'ЕГЭ') : '★';
  return h('a', { class: 'card card--link task-card', href: `/task/${subject.id}/${t.id}` },
    h('div', { class: 'task-card__top' },
      h('span', { class: `task-card__n ${t.kind === 'olymp' ? 'bg-sun' : ''}` }, badge),
      h('span', { class: 'pill' }, t.level),
    ),
    h('h3', { text: t.title }),
    h('p', { class: 'preview' }, plainText(t.statement, 170)),
    h('span', { class: 'label' }, t.answer ? 'Ответ + краткое решение + наставник' : 'Решение + наставник'),
  );
}

function sourceLink(title, url, note) {
  return h('a', { class: 'source', href: url, ...ext }, h('div', null, h('strong', null, title), h('span', null, note)), h('span', { 'aria-hidden': 'true' }, '↗'));
}

function egeTab(s) {
  const catalog = `${s.sdamgia}/prob_catalog`;
  const tasks = s.tasks.filter((t) => t.kind === 'ege');
  const byLine = new Map(tasks.filter((t) => t.n).map((t) => [String(t.n), t]));
  const out = h('div', { class: 'sections' });

  out.append(h('section', { class: 'stack' },
    h('div', { class: 'section-head' },
      h('h2', { class: 'display display--sm', text: 'Задачи с разбором' }),
      h('a', { class: 'btn', href: catalog, ...ext }, 'Ещё тысячи задач — «Решу ЕГЭ» ↗'),
    ),
    h('div', { class: 'grid grid--3' }, tasks.map((t) => taskCard(s, t))),
  ));

  const structure = Array.isArray(s.structure) && s.structure.length
    ? h('div', { class: 'kim' }, s.structure.map((r) => {
      const t = byLine.get(String(r.n));
      return h('div', { class: `kim__row ${r.part === 2 ? 'kim__row--p2' : ''}` },
        h('span', { class: 'kim__n', text: r.n }),
        h('div', null, h('strong', null, r.topic), h('div', { class: 'caption muted' }, `Часть ${r.part ?? 1}${r.points ? ` · ${r.points} ${r.points === 1 ? 'балл' : r.points < 5 ? 'балла' : 'баллов'}` : ''}`)),
        h('div', { class: 'row', style: { gap: '6px', justifyContent: 'flex-end' } },
          t ? h('a', { class: 'pill has-task', href: `/task/${s.id}/${t.id}` }, 'Разбор') : null,
          h('a', { class: 'pill', href: catalog, ...ext }, 'Задачи ↗'),
        ),
      );
    }))
    : h('div', { class: 'grid grid--3' }, (s.sections ?? []).map((sec, i) => h('article', { class: `card ${['bg-white', 'bg-sky', 'bg-lavender', 'bg-mint', 'bg-sun'][i % 5]}` },
      h('h3', { text: sec.title }),
      h('ul', { class: 'prose', style: { marginTop: '12px', fontSize: '15px' } }, (sec.items ?? []).map((it) => h('li', null, it))),
    )));

  out.append(h('section', { class: 'stack' },
    h('div', { class: 'section-head' },
      h('h2', { class: 'display display--sm', text: 'Структура экзамена' }),
      h('p', { class: 'caption', style: { maxWidth: '46ch' } }, 'По последней опубликованной демоверсии ФИПИ. Перед экзаменом сверяйся с актуальной спецификацией на fipi.ru.'),
    ),
    s.exam?.note ? md(s.exam.note) : null,
    structure,
  ));

  if (s.theory?.length) {
    out.append(h('section', { class: 'stack' },
      h('h2', { class: 'display display--sm', text: 'Шпаргалки' }),
      h('div', { class: 'grid grid--theory' }, s.theory.map((t) => h('article', { class: 'card card--xl' }, h('h3', { style: { marginBottom: '14px' }, text: t.title }), md(t.body)))),
    ));
  }

  out.append(h('section', { class: 'stack' },
    h('h2', { class: 'display display--sm', text: 'Источники' }),
    h('div', { class: 'source-list' },
      sourceLink('Решу ЕГЭ — каталог заданий', catalog, 'Все номера КИМ по темам, с ответами и решениями. Основной банк задач для тренировки.'),
      sourceLink('Решу ЕГЭ — варианты', s.sdamgia, 'Тренировочные варианты и тесты по предмету.'),
      sourceLink('ФИПИ', 'https://fipi.ru/', 'Демоверсии, спецификации, кодификаторы и открытый банк заданий.'),
    ),
  ));
  return out;
}

function olympTab(s) {
  const o = s.olymp;
  const tasks = s.tasks.filter((t) => t.kind === 'olymp');
  const out = h('div', { class: 'sections' });
  out.append(h('section', { class: 'grid grid--2' },
    h('article', { class: 'card card--xl bg-lavender' }, h('h2', { class: 'heading-sm', style: { marginBottom: '14px' }, text: 'Как устроены олимпиады' }), md(o.intro)),
    h('article', { class: 'card card--xl bg-violet' }, h('h2', { class: 'heading-sm', style: { marginBottom: '14px' }, text: 'ВсОШ' }), md(o.vsosh)),
  ));
  out.append(h('section', { class: 'stack' },
    h('div', { class: 'section-head' },
      h('h2', { class: 'display display--sm', text: 'Олимпиады РСОШ' }),
      h('a', { class: 'btn', href: 'https://rsr-olymp.ru/', ...ext }, 'Актуальный перечень и уровни ↗'),
    ),
    h('div', { class: 'grid grid--3' }, o.rsosh.map((r, i) => h('article', { class: `card ${['bg-white', 'bg-sun', 'bg-mint', 'bg-sky', 'bg-lavender'][i % 5]}` },
      h('h3', { text: r.name }),
      r.org ? h('p', { class: 'label', style: { margin: '8px 0' } }, r.org) : null,
      r.note ? h('p', { style: { margin: 0 } }, r.note) : null,
    ))),
    h('p', { class: 'caption muted' }, 'Состав Перечня и уровни олимпиад утверждаются каждый год — проверяй на сайте Российского совета олимпиад школьников.'),
  ));
  if (tasks.length) {
    out.append(h('section', { class: 'stack' },
      h('h2', { class: 'display display--sm', text: 'Задачи с разбором' }),
      h('div', { class: 'grid grid--3' }, tasks.map((t) => taskCard(s, t))),
    ));
  }
  out.append(h('section', { class: 'stack' },
    h('h2', { class: 'display display--sm', text: 'Что учить' }),
    h('div', { class: 'topic-cloud' }, o.topics.map((t) => h('span', { class: 'pill' }, t))),
  ));
  out.append(h('section', { class: 'stack' },
    h('h2', { class: 'display display--sm', text: 'Материалы' }),
    h('div', { class: 'source-list' }, o.links.map((l) => sourceLink(l.title, l.url, l.note ?? ''))),
  ));
  return out;
}

export async function subjectView([id], query) {
  const s = await getSubject(id);
  document.title = `${s.name}: ЕГЭ и олимпиады — ${store.config.brand}`;
  let tab = query.get('tab') === 'olymp' ? 'olymp' : 'ege';
  const panel = h('div', { role: 'tabpanel', id: 'subject-panel' });
  const tabs = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Разделы предмета' });

  const renderTabs = () => {
    clear(tabs);
    for (const [key, label] of [['ege', 'ЕГЭ'], ['olymp', 'Олимпиады ВсОШ · РСОШ']]) {
      tabs.append(h('button', {
        type: 'button', role: 'tab', 'aria-selected': String(tab === key), 'aria-controls': 'subject-panel',
        onclick: () => {
          tab = key;
          const url = new URL(location.href);
          if (key === 'olymp') url.searchParams.set('tab', 'olymp'); else url.searchParams.delete('tab');
          history.replaceState(null, '', url);
          renderTabs();
          clear(panel).append(key === 'ege' ? egeTab(s) : olympTab(s));
        },
      }, label));
    }
  };
  renderTabs();
  panel.append(tab === 'ege' ? egeTab(s) : olympTab(s));

  const e = s.exam ?? {};
  return h('div', null,
    h('section', { class: `subject-hero bg-${s.color}` },
      h('div', { class: 'sticker-main' }, sticker(s.sticker)),
      h('div', { class: 'wrap' },
        h('nav', { class: 'breadcrumbs', 'aria-label': 'Навигация' },
          h('a', { class: 'pill', href: '/subjects' }, '← Предметы'),
          h('span', { class: 'pill pill--dark' }, s.name),
        ),
        h('div', { class: 'hero__title', style: { textAlign: 'left', marginTop: 0 } },
          s.color === 'blue' ? null : ribbon('hero__ribbon', 'arc'),
          h('h1', { class: 'display display--fit', style: { '--chars': String(Math.max(6, s.display.length)) }, text: s.display }),
        ),
        h('p', { class: 'tagline', style: { marginTop: '24px', position: 'relative', zIndex: 2 } }, s.tagline),
        h('div', { class: 'row', style: { marginTop: '20px', position: 'relative', zIndex: 2 } },
          h('span', { class: 'pill' }, `${e.tasks} заданий`),
          e.duration ? h('span', { class: 'pill' }, e.duration) : null,
          e.maxPrimary ? h('span', { class: 'pill' }, `${e.maxPrimary} перв. баллов`) : null,
          e.minScore ? h('span', { class: 'pill' }, `порог — ${e.minScore}`) : null,
        ),
        h('div', { class: 'row', style: { marginTop: '24px', position: 'relative', zIndex: 2 } },
          h('a', { class: 'btn btn--primary btn--lg', href: `/solver?subject=${s.id}` }, 'Спросить наставника'),
          h('a', { class: 'btn btn--lg', href: `${s.sdamgia}/prob_catalog`, ...ext }, 'Каталог «Решу ЕГЭ» ↗'),
        ),
      ),
    ),
    h('section', { class: 'band band--tight' }, h('div', { class: 'wrap stack' }, tabs, h('div', { style: { marginTop: '32px' } }, panel))),
  );
}
