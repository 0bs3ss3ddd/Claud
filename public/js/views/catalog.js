import { h } from '../dom.js';
import { store, getSubjects } from '../store.js';
import { sticker, ribbon } from '../stickers.js';
import { subjectCard } from './home.js';

export async function subjectsView() {
  document.title = `Предметы ЕГЭ — ${store.config.brand}`;
  const subjects = await getSubjects();
  return h('div', null,
    h('section', { class: 'hero' },
            h('div', { class: 'floating sticker-a' }, sticker('book')),
      h('div', { class: 'floating sticker-b' }, sticker('globe')),
      h('div', { class: 'wrap hero__title' },
        ribbon('hero__ribbon', 'loop'), h('h1', { class: 'display display--lg', text: 'Предметы' })),
      h('div', { class: 'wrap hero__sub' }, h('p', { class: 'tagline' }, 'Выбери предмет: структура ЕГЭ, задачи с разбором, шпаргалки и олимпиадный раздел.')),
    ),
    h('section', { class: 'band' }, h('div', { class: 'wrap' }, h('div', { class: 'grid grid--subjects' }, subjects.map(subjectCard)))),
  );
}

export async function olympiadsView() {
  document.title = `ВсОШ и олимпиады РСОШ — ${store.config.brand}`;
  const subjects = await getSubjects();
  const stages = [
    ['1', 'Школьный', 'сентябрь — октябрь', 'Задания составляет регион, пишут все желающие. По многим предметам — онлайн на платформе «Сириус».'],
    ['2', 'Муниципальный', 'ноябрь — декабрь', 'Проходной балл устанавливает регион. Задачи заметно сложнее школьных.'],
    ['3', 'Региональный', 'январь — февраль', 'Задания единые для всей страны. Отсюда выходят на финал по баллам, которые утверждает оргкомитет.'],
    ['4', 'Заключительный', 'март — апрель', 'Финал в одном городе. Победители и призёры получают право на поступление без вступительных испытаний.'],
  ];
  const link = (title, url, note) => h('a', { class: 'source', href: url, target: '_blank', rel: 'noopener noreferrer' }, h('div', null, h('strong', null, title), h('span', null, note)), h('span', { class: 'arrow', 'aria-hidden': 'true' }, '↗'));

  return h('div', null,
    h('section', { class: 'hero' },
            h('div', { class: 'floating sticker-a' }, sticker('medal')),
      h('div', { class: 'floating sticker-b' }, sticker('star')),
      h('div', { class: 'floating sticker-d' }, sticker('rocket')),
      h('div', { class: 'wrap hero__title' },
        ribbon('hero__ribbon', 'arc'), h('h1', { class: 'display display--lg', text: 'Олимпиады' })),
      h('div', { class: 'wrap hero__sub' }, h('p', { class: 'tagline' }, 'ВсОШ и перечневые олимпиады РСОШ — короткий путь в сильный вуз. В каждом предмете есть свой олимпиадный раздел.')),
    ),
    h('section', { class: 'band' }, h('div', { class: 'wrap stack' },
      h('h2', { class: 'display display--sm', text: 'Этапы ВсОШ' }),
      h('div', { class: 'olymp-stage' }, stages.map(([n, t, when, text], i) => h('article', { class: `card bg-${['sun', 'mint', 'lavender', 'violet'][i]}` },
        h('div', { class: 'num', text: n }),
        h('h3', { style: { marginTop: '14px' }, text: t }),
        h('p', { class: 'label', style: { margin: '6px 0 10px' }, text: when }),
        h('p', { style: { margin: 0 } }, text),
      ))),
      h('p', { class: 'caption muted' }, 'Сроки — ориентировочные, точные даты каждого этапа публикует региональный оргкомитет и Минпросвещения.'),
    )),
    h('section', { class: 'band bg-gray' }, h('div', { class: 'wrap' },
      h('div', { class: 'grid grid--2' },
        h('article', { class: 'card card--xl' },
          h('h2', { class: 'heading-sm', text: 'Что даёт ВсОШ' }),
          h('ul', { class: 'prose', style: { marginTop: '14px' } },
            h('li', null, 'Победители и призёры заключительного этапа поступают без вступительных испытаний (БВИ) на направления, соответствующие профилю олимпиады.'),
            h('li', null, 'Льгота действует 4 года после олимпиады.'),
            h('li', null, 'Результаты регионального этапа учитываются во многих вузах как индивидуальные достижения.'),
          ),
        ),
        h('article', { class: 'card card--xl bg-sun' },
          h('h2', { class: 'heading-sm', text: 'Что даёт РСОШ' }),
          h('ul', { class: 'prose', style: { marginTop: '14px' } },
            h('li', null, 'Олимпиады из Перечня Минобрнауки имеют уровни I, II или III — от уровня зависит льгота.'),
            h('li', null, 'Диплом можно использовать как БВИ или как 100 баллов ЕГЭ по профильному предмету — правила устанавливает каждый вуз.'),
            h('li', null, 'Льготу нужно подтвердить баллом ЕГЭ по профильному предмету (как правило, не ниже 75).'),
          ),
        ),
      ),
    )),
    h('section', { class: 'band' }, h('div', { class: 'wrap' },
      h('div', { class: 'section-head' },
        h('h2', { class: 'display display--sm', text: 'По предметам' }),
        h('p', { class: 'tagline', style: { fontSize: '18px' } }, 'Список олимпиад РСОШ, темы и олимпиадные задачи с разбором.'),
      ),
      h('div', { class: 'grid grid--subjects' }, subjects.map((s) => h('a', { class: `card card--link subject-card bg-${s.color}`, href: `/subject/${s.id}?tab=olymp` },
        sticker(s.sticker),
        h('div', { class: 'subject-card__name', text: s.display }),
        h('span', { class: 'label subject-card__full', text: s.name }),
        h('p', { class: 'caption', style: { marginTop: '14px' } }, `Олимпиадные задачи с разбором: ${s.olympCount}`),
      ))),
    )),
    h('section', { class: 'band bg-sky' }, h('div', { class: 'wrap stack' },
      h('h2', { class: 'display display--sm', text: 'Источники' }),
      h('div', { class: 'source-list' },
        link('MathUs.ru — И. В. Яковлев', 'https://mathus.ru/', 'Олимпиадная математика и физика: листки по темам, варианты олимпиад, задачи ДВИ.'),
        link('Российский совет олимпиад школьников', 'https://rsr-olymp.ru/', 'Актуальный перечень олимпиад и их уровни на текущий учебный год.'),
        link('Всероссийская олимпиада школьников', 'https://vserosolimp.edsoo.ru/', 'Официальный портал ВсОШ: сроки и новости.'),
        link('Архив ВсОШ', 'https://vos.olimpiada.ru/', 'Задания и решения этапов прошлых лет.'),
        link('Олимпиада.ру', 'https://olimpiada.ru/', 'Календарь всех олимпиад школьников с описаниями и архивами.'),
      ),
    )),
  );
}
