import { h } from '../dom.js';
import { store, getSubjects } from '../store.js';
import { sticker, ribbon } from '../stickers.js';
import { md } from '../render.js';
import { plansBlock, faq } from './pricing.js';

export function subjectCard(s) {
  return h('a', { class: `card card--link subject-card bg-${s.color}`, href: `/subject/${s.id}` },
    sticker(s.sticker),
    h('div', null,
      h('div', { class: 'subject-card__name', text: s.display }),
      h('span', { class: 'label subject-card__full', text: s.name }),
      h('p', { class: 'caption', style: { marginTop: '8px', maxWidth: '32ch' } }, s.tagline),
    ),
    h('div', { class: 'subject-card__meta' },
      h('span', { class: 'pill' }, `${s.examTasks} заданий КИМ`),
      h('span', { class: 'pill' }, `${s.egeCount + s.olympCount} разборов`),
      h('span', { class: 'pill' }, 'ВсОШ · РСОШ'),
    ),
  );
}

const DEMO = String.raw`**Шаг 3.** Производная $y' = 3x^2 - 3$ обращается в ноль при $x = \pm 1$. В отрезок $[0;\ 2]$ попадает только $x = 1$ — там функция меняет убывание на возрастание:

:::graph
{"title": "y = x³ − 3x + 4 на отрезке [0; 2]", "x": [-0.5, 2.5], "y": [0, 8],
 "functions": [{"f": "x^3 - 3*x + 4", "label": "y = x³ − 3x + 4", "color": "blue"}],
 "vlines": [0, 2], "points": [{"x": 1, "y": 2, "label": "min (1; 2)"}]}
:::

> Частая ошибка — записать в ответ $x = 1$. Спрашивают **значение функции**: $y(1) = 2$.`;

export async function homeView() {
  document.title = `${store.config.brand} — онлайн-репетитор для ЕГЭ и олимпиад`;
  const subjects = await getSubjects();
  const { priceRub, trialMessages } = store.config;

  const hero = h('section', { class: 'hero' },
    h('div', { class: 'floating sticker-a' }, sticker('pencil')),
    h('div', { class: 'floating sticker-b' }, sticker('coin5')),
    h('div', { class: 'floating sticker-c' }, sticker('atom')),
    h('div', { class: 'floating sticker-d' }, sticker('check')),
    h('div', { class: 'floating sticker-e' }, sticker('star')),
    h('div', { class: 'wrap hero__title' },
      ribbon('hero__ribbon', 'wave'),
      h('span', { class: 'pill', style: { position: 'relative', zIndex: 3, marginBottom: '20px' } }, 'онлайн-репетитор · ЕГЭ · ВсОШ · РСОШ'),
      h('h1', { class: 'display display--xl' }, store.config.brand),
    ),
    h('div', { class: 'wrap hero__sub' },
      h('p', { class: 'tagline' }, `Материалы, задачи и решения ЕГЭ — бесплатно. Наставник, который подскажет, разберёт каждый шаг и нарисует график, карту или покажет картину, — ${priceRub} ₽.`),
      h('div', { class: 'row', style: { justifyContent: 'center' } },
        h('a', { class: 'btn btn--primary btn--lg', href: '/#subjects' }, 'Выбрать предмет'),
        h('a', { class: 'btn btn--lg', href: '/solver' }, 'Решатель ЕГЭ'),
      ),
      h('div', { class: 'stat-strip' },
        h('span', { class: 'pill' }, `${subjects.length} предметов`),
        h('span', { class: 'pill' }, 'задачи по каталогу «Решу ЕГЭ»'),
        h('span', { class: 'pill' }, 'олимпиады с MathUs'),
        h('span', { class: 'pill pill--dark' }, '1 разбор в неделю — даром'),
      ),
    ),
  );

  const subjectsBand = h('section', { class: 'band', id: 'subjects' },
    h('div', { class: 'wrap' },
      h('div', { class: 'section-head' },
        h('h2', { class: 'display display--md', text: 'Предметы' }),
        h('p', { class: 'tagline', style: { fontSize: '18px' } }, 'Каждый предмет ЕГЭ — это структура экзамена, шпаргалки, задачи с разбором и свой олимпиадный раздел для ВсОШ и РСОШ.'),
      ),
      h('div', { class: 'grid grid--subjects' }, subjects.map(subjectCard)),
    ),
  );

  const step = (n, color, title, text, st) => h('article', { class: `card card--xl step bg-${color}` },
    h('div', { style: { position: 'absolute', right: '20px', top: '20px', width: '64px' } }, sticker(st)),
    h('div', { class: 'step__num bg-white' }, String(n)),
    h('h3', { class: 'heading-sm', text: title }),
    h('p', { style: { marginTop: '10px' } }, text),
  );

  const tutorBand = h('section', { class: 'band bg-gray' },
    h('div', { class: 'wrap' },
      h('div', { class: 'section-head' },
        h('h2', { class: 'display display--md', text: 'Наставник' }),
        h('p', { class: 'tagline', style: { fontSize: '18px' } }, 'Не просто ответы — объяснения, как у хорошего репетитора. Работает по всем предметам и для олимпиад.'),
      ),
      h('div', { class: 'grid grid--2' },
        h('div', { class: 'grid', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))' } },
          step(1, 'sun', 'Подсказка', 'Не знаешь, с чего начать? Наставник даст следующий шаг и не раскроет ответ.', 'bulb'),
          step(2, 'mint', 'Разбор', 'Полное решение по кнопке: что дано, идея, шаги, проверка и типичные ошибки.', 'book'),
          step(3, 'lavender', 'Картинки', 'Графики функций, чертежи, карты сражений и картины для истории — прямо в объяснении.', 'map'),
          step(4, 'white', 'Вопросы', 'Не понял шаг? Спроси — наставник объяснит иначе и проверит твоё решение.', 'bubble'),
        ),
        h('article', { class: 'card card--xl' },
          h('div', { class: 'row', style: { justifyContent: 'space-between', marginBottom: '16px' } },
            h('span', { class: 'label' }, 'Так выглядит разбор'),
            h('span', { class: 'pill' }, 'Математика · №12'),
          ),
          md(DEMO),
          h('a', { class: 'btn btn--primary', href: '/task/math/e12' }, 'Открыть задачу целиком'),
        ),
      ),
    ),
  );

  const olympBand = h('section', { class: 'band bg-sky' },
    h('div', { class: 'wrap' },
      h('div', { class: 'section-head' },
        h('h2', { class: 'display display--md', text: 'Олимпиады' }),
        h('a', { class: 'btn btn--primary btn--lg', href: '/olympiads' }, 'Как готовиться'),
      ),
      h('div', { class: 'grid grid--2' },
        h('article', { class: 'card card--xl bg-violet' },
          h('div', { style: { position: 'absolute', right: '24px', top: '-22px', width: '88px', transform: 'rotate(8deg)' } }, sticker('medal')),
          h('h3', { class: 'display display--sm', text: 'ВсОШ' }),
          h('p', { class: 'tagline', style: { fontSize: '18px', marginTop: '16px' } }, 'Всероссийская олимпиада школьников: школьный → муниципальный → региональный → заключительный этап. Победители и призёры финала поступают без экзаменов.'),
        ),
        h('article', { class: 'card card--xl bg-sun' },
          h('div', { style: { position: 'absolute', right: '24px', top: '-22px', width: '84px', transform: 'rotate(-8deg)' } }, sticker('star')),
          h('h3', { class: 'display display--sm', text: 'РСОШ' }),
          h('p', { class: 'tagline', style: { fontSize: '18px', marginTop: '16px' } }, 'Перечневые олимпиады вузов — «Физтех», «Высшая проба», «Ломоносов» и другие. Диплом — это БВИ или 100 баллов ЕГЭ по профильному предмету.'),
        ),
      ),
    ),
  );

  const plans = h('section', { class: 'band', id: 'plans' },
    h('div', { class: 'wrap' },
      h('div', { class: 'section-head' },
        h('h2', { class: 'display display--md', text: 'Тарифы' }),
        h('p', { class: 'tagline', style: { fontSize: '18px' } }, 'Два тарифа, как в школе: «Ученик» — всё бесплатно, «Отличник» — личный наставник.'),
      ),
      plansBlock(),
    ),
  );

  const faqBand = h('section', { class: 'band bg-sky' },
    h('div', { class: 'wrap faq' },
      h('h2', { class: 'display display--md', style: { marginBottom: '32px' }, text: 'Вопросы' }),
      faq('Что на сайте бесплатно?', 'Всё учебное: структура экзаменов, шпаргалки, задачи с ответами и краткими решениями, олимпиадные разделы, ссылки на каталог «Решу ЕГЭ» и материалы MathUs. Платный только личный наставник.'),
      faq('Как работает бесплатный разбор недели?', `Раз в неделю любой зарегистрированный ученик может открыть наставника для одной задачи: подсказки, полное решение со всеми объяснениями и до ${trialMessages} сообщений. Попытка обновляется каждый понедельник.`),
      faq('Что даёт «Отличник»?', `Наставник без недельного лимита по всем предметам и олимпиадам, полные разборы по кнопке, графики, карты и картины в объяснениях и Решатель ЕГЭ — вставляешь любую задачу и получаешь разбор. ${priceRub} ₽ за 30 дней, без автосписаний.`),
      faq('Откуда задачи?', 'Структура экзаменов — по демоверсиям ФИПИ, тысячи задач по каждому номеру — в открытом каталоге «Решу ЕГЭ» (ссылки на каждой странице предмета). Олимпиадные материалы — MathUs.ru И. В. Яковлева, архивы ВсОШ и перечневых олимпиад.'),
      faq('Наставник — это человек?', 'Это ИИ-наставник на базе Claude (Anthropic), настроенный объяснять как репетитор. Подсказки и полные решения задач каталога подготовлены заранее, а на вопросы и новые задачи наставник отвечает сам — с эталонным решением под рукой.'),
    ),
  );

  return h('div', null, hero, subjectsBand, tutorBand, olympBand, plans, faqBand);
}
