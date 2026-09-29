import { h, clear } from '../dom.js';
import { store, getSubject, onChange } from '../store.js';
import { sticker } from '../stickers.js';
import { md } from '../render.js';
import { createTutorSession, accessLine } from '../tutor.js';

const ext = { target: '_blank', rel: 'noopener noreferrer' };

export function normalizeAnswer(v) {
  return String(v ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[−–—]/g, '-')
    .replace(/[\s ]+/g, '')
    .replace(/,/g, '.')
    .replace(/[.;]+$/, '')
    .replace(/[«»"']/g, '');
}

export function isCorrect(input, task) {
  const variants = [task.answer, ...(task.accept ?? [])].filter(Boolean).map(normalizeAnswer);
  const given = normalizeAnswer(input);
  if (!given) return false;
  // «Запишите номера ответов» — в ЕГЭ порядок цифр не важен
  const sorted = (v) => v.split('').sort().join('');
  if (task.unordered && /^\d+$/.test(given)) return variants.some((v) => sorted(v) === sorted(given));
  if (variants.includes(given)) return true;
  const n = Number(given);
  return Number.isFinite(n) && variants.some((v) => v !== '' && Number.isFinite(Number(v)) && Math.abs(Number(v) - n) < 1e-9);
}

/** Следит за изменениями доступа, пока элемент в документе. */
function live(el, renderFn) {
  const off = onChange(() => {
    if (!document.body.contains(el)) { off(); return; }
    renderFn();
  });
  renderFn();
  return el;
}

function tutorPanel(s, t) {
  const scope = `task:${s.id}:${t.id}`;
  const status = h('div');
  const actions = h('div', { class: 'tutor__actions' });
  const textarea = h('textarea', { class: 'textarea', rows: 2, maxlength: 4000, placeholder: 'Спроси про задачу: «почему здесь минус?», «проверь моё решение…»', 'aria-label': 'Вопрос наставнику' });
  const send = h('button', { class: 'btn btn--primary', type: 'submit' }, 'Спросить');

  const session = createTutorSession({ scope, subjectId: s.id, taskId: t.id, mode: t.kind === 'olymp' ? 'olymp' : 'ege', onChange: () => renderActions() });

  function renderActions() {
    clear(actions);
    const next = session.hintsAsked + 1;
    const maxHints = store.config.aiEnabled ? 5 : t.hintsCount;
    const hintLabel = next <= t.hintsCount ? `💡 Подсказка ${next} из ${t.hintsCount}` : '💡 Ещё подсказка';
    actions.append(
      h('button', { class: 'btn', type: 'button', disabled: session.busy || next > maxHints, onclick: () => session.ask('hint') }, next > maxHints ? '💡 Подсказки закончились' : hintLabel),
      h('button', { class: 'btn btn--primary', type: 'button', disabled: session.busy, onclick: () => session.ask('solution') }, session.hasSolution ? '📘 Решение ещё раз' : '📘 Полное решение'),
    );
    if (!session.isEmpty) actions.append(h('button', { class: 'btn btn--sm', type: 'button', disabled: session.busy, onclick: () => session.reset() }, 'Очистить'));
    send.disabled = session.busy;
  }

  const form = h('form', {
    class: 'tutor__form',
    onsubmit: (e) => {
      e.preventDefault();
      const q = textarea.value.trim();
      if (!q || session.busy) return;
      textarea.value = '';
      session.ask('chat', { question: q });
    },
  }, textarea, send);
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) form.requestSubmit();
  });

  const panel = h('aside', { class: 'card card--xl tutor', 'aria-label': 'Наставник' },
    h('div', { class: 'tutor__head' },
      h('h2', { class: 'tutor__title', text: 'Наставник' }),
      h('div', { style: { width: '52px' } }, sticker('bulb')),
    ),
    live(status, () => clear(status).append(accessLine(scope))),
    session.el,
    h('p', { class: 'tutor__empty' }, t.answer
      ? 'Застрял? Возьми подсказку — наставник подскажет следующий шаг, не раскрывая ответ. Или открой полное решение со всеми объяснениями.'
      : 'Попроси подсказку, открой полное доказательство или вставь своё решение в поле ниже — наставник проверит его и найдёт ошибку.'),
    actions,
    form,
  );
  renderActions();
  return panel;
}

export async function taskView([subjectId, taskId]) {
  const s = await getSubject(subjectId);
  const t = s.tasks.find((x) => x.id === taskId);
  if (!t) { const e = new Error('Задача не найдена'); e.status = 404; throw e; }
  document.title = `${t.title} — ${s.name} — ${store.config.brand}`;

  const siblings = s.tasks.filter((x) => x.kind === t.kind);
  const idx = siblings.indexOf(t);
  const prev = siblings[idx - 1];
  const next = siblings[idx + 1];

  const verdict = h('div', { 'aria-live': 'polite' });
  let answerBlock;
  if (t.answer) {
    const input = h('input', { class: 'input', name: 'answer', autocomplete: 'off', maxlength: 100, placeholder: 'Твой ответ', 'aria-label': 'Твой ответ' });
    const reveal = h('button', { class: 'btn', type: 'button', onclick: () => {
      clear(verdict).append(h('div', { class: 'verdict bg-sky' }, 'Ответ: ', h('strong', null, t.answer)));
    } }, 'Показать ответ');
    answerBlock = h('div', { class: 'stack' },
      h('form', {
        class: 'answer-form',
        onsubmit: (e) => {
          e.preventDefault();
          if (!input.value.trim()) return;
          const ok = isCorrect(input.value, t);
          clear(verdict).append(h('div', { class: `verdict ${ok ? 'verdict--ok' : 'verdict--no'}` },
            ok ? '✓ Верно! Загляни в краткое решение — проверь, что рассуждал так же.' : '✗ Пока нет. Возьми подсказку у наставника или попробуй ещё раз.'));
        },
      }, input, h('button', { class: 'btn btn--primary', type: 'submit' }, 'Проверить'), reveal),
      verdict,
    );
  } else {
    answerBlock = h('p', { class: 'notice notice--sky' }, 'Здесь развёрнутый ответ: сравни своё решение с кратким разбором или отправь его наставнику на проверку.');
  }

  const sourceHint = t.kind === 'ege'
    ? h('a', { class: 'source', href: `${s.sdamgia}/prob_catalog`, ...ext }, h('div', null, h('strong', null, `Похожие задачи${t.n ? ` №${t.n}` : ''} — «Решу ЕГЭ»`), h('span', null, 'Тренируйся на задачах этого типа из открытого каталога.')), h('span', { 'aria-hidden': 'true' }, '↗'))
    : (s.olymp.links[0] ? h('a', { class: 'source', href: s.olymp.links[0].url, ...ext }, h('div', null, h('strong', null, s.olymp.links[0].title), h('span', null, s.olymp.links[0].note ?? '')), h('span', { 'aria-hidden': 'true' }, '↗')) : null);

  const left = h('div', { class: 'stack' },
    h('article', { class: 'card card--xl stack' },
      h('div', { class: 'row' },
        h('span', { class: `task-card__n ${t.kind === 'olymp' ? 'bg-sun' : `bg-${s.color}`}` }, t.kind === 'ege' ? (t.n ? `№${t.n}` : 'ЕГЭ') : '★'),
        h('span', { class: 'pill' }, t.kind === 'ege' ? 'ЕГЭ' : 'Олимпиада'),
        h('span', { class: 'pill' }, t.level),
      ),
      h('h1', { class: 'heading', style: { fontSize: 'clamp(28px, 3.4vw, 44px)' }, text: t.title }),
      md(t.statement),
      answerBlock,
    ),
    h('details', { class: 'reveal' },
      h('summary', null, 'Краткое решение — бесплатно'),
      h('div', { class: 'reveal__body' }, md(t.short)),
    ),
    sourceHint,
    h('div', { class: 'row', style: { justifyContent: 'space-between' } },
      prev ? h('a', { class: 'btn', href: `/task/${s.id}/${prev.id}` }, `← ${prev.kind === 'ege' && prev.n ? `№${prev.n}` : prev.title}`) : h('span'),
      next ? h('a', { class: 'btn', href: `/task/${s.id}/${next.id}` }, `${next.kind === 'ege' && next.n ? `№${next.n}` : next.title} →`) : h('span'),
    ),
  );

  return h('div', null,
    h('section', { class: `band band--tight bg-sky` }, h('div', { class: 'wrap' },
      h('nav', { class: 'breadcrumbs', 'aria-label': 'Навигация' },
        h('a', { class: 'pill', href: '/subjects' }, 'Предметы'),
        h('a', { class: 'pill', href: `/subject/${s.id}${t.kind === 'olymp' ? '?tab=olymp' : ''}` }, s.name),
        h('span', { class: 'pill pill--dark' }, t.kind === 'ege' ? `Задание${t.n ? ` №${t.n}` : ''}` : 'Олимпиадная задача'),
      ),
      h('div', { class: 'task-layout' }, left, tutorPanel(s, t)),
    )),
  );
}
