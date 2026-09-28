import { h, clear, storage } from '../dom.js';
import { store, getSubjects, onChange } from '../store.js';
import { sticker, ribbon } from '../stickers.js';
import { createTutorSession, accessLine, newChatScope } from '../tutor.js';

const session = storage('session');

export async function solverView(_params, query) {
  document.title = `Решатель ЕГЭ — ${store.config.brand}`;
  const subjects = await getSubjects();
  let scope = session.get('solver:scope') ?? newChatScope();
  session.set('solver:scope', scope);
  const opts = { scope, subjectId: subjects.some((s) => s.id === query.get('subject')) ? query.get('subject') : 'any', mode: 'ege', onChange: () => renderButtons() };
  let tutor = createTutorSession(opts);

  const subjectChips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Предмет' });
  const modeChips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Формат' });
  const renderChips = () => {
    clear(subjectChips).append(
      ...[{ id: 'any', name: 'Любой предмет' }, ...subjects].map((s) => h('button', { class: 'chip', type: 'button', 'aria-pressed': String(opts.subjectId === s.id), onclick: () => { opts.subjectId = s.id; renderChips(); } }, s.name)),
    );
    clear(modeChips).append(
      ...[['ege', 'ЕГЭ'], ['olymp', 'Олимпиада']].map(([k, label]) => h('button', { class: 'chip', type: 'button', 'aria-pressed': String(opts.mode === k), onclick: () => { opts.mode = k; renderChips(); } }, label)),
    );
  };
  renderChips();

  const problem = h('textarea', { class: 'textarea', rows: 7, maxlength: 3800, placeholder: 'Вставь условие задачи. Например: «Найдите наименьшее значение функции y = x³ − 27x на отрезке [0; 4]»', 'aria-label': 'Условие задачи' });
  const solveBtn = h('button', { class: 'btn btn--primary btn--lg', type: 'button', onclick: () => start('solve') }, 'Решить с объяснением');
  const hintBtn = h('button', { class: 'btn btn--lg', type: 'button', onclick: () => start('hint') }, 'Только подсказку');
  const followUp = h('textarea', { class: 'textarea', rows: 2, maxlength: 3800, placeholder: 'Уточни: «а почему здесь так?»', 'aria-label': 'Уточняющий вопрос' });
  const followBtn = h('button', { class: 'btn btn--primary', type: 'submit' }, 'Спросить');
  const followForm = h('form', {
    class: 'tutor__form',
    onsubmit: (e) => {
      e.preventDefault();
      const q = followUp.value.trim();
      if (!q || tutor.busy) return;
      followUp.value = '';
      tutor.ask('chat', { question: q });
    },
  }, followUp, followBtn);
  const resetBtn = h('button', { class: 'btn', type: 'button', onclick: () => {
    tutor.reset();
    scope = newChatScope();
    session.set('solver:scope', scope);
    opts.scope = scope;
    const old = tutor.el;
    tutor = createTutorSession(opts);
    old.replaceWith(tutor.el);
    renderButtons();
    problem.focus();
  } }, 'Новая задача');

  function start(kind) {
    const text = problem.value.trim();
    if (text.length < 10 || tutor.busy) { problem.focus(); return; }
    const question = kind === 'solve'
      ? `Реши задачу и объясни решение по шагам.\n\nУсловие:\n${text}`
      : `Дай первую подсказку к задаче, не раскрывая ответ.\n\nУсловие:\n${text}`;
    tutor.ask('chat', { question });
  }

  function renderButtons() {
    const busy = tutor.busy;
    solveBtn.disabled = busy;
    hintBtn.disabled = busy;
    followBtn.disabled = busy;
    followForm.hidden = tutor.isEmpty;
    resetBtn.hidden = tutor.isEmpty;
  }

  const status = h('div');
  const off = onChange(() => { if (!document.body.contains(status)) { off(); return; } clear(status).append(accessLine(opts.scope)); });
  status.append(accessLine(opts.scope));

  const view = h('div', null,
    h('section', { class: 'hero bg-mint', style: { background: 'var(--mint)' } },
            h('div', { class: 'floating sticker-a' }, sticker('bulb')),
      h('div', { class: 'floating sticker-b' }, sticker('pi')),
      h('div', { class: 'floating sticker-d' }, sticker('check')),
      h('div', { class: 'wrap hero__title' },
        ribbon('hero__ribbon', 'loop'), h('h1', { class: 'display display--lg', text: 'Решатель' })),
      h('div', { class: 'wrap hero__sub' },
        h('p', { class: 'tagline' }, 'Вставь условие любой задачи ЕГЭ или олимпиады — наставник решит, объяснит каждый шаг и нарисует, что нужно.'),
        h('span', { class: 'pill pill--dark' }, `тариф «Отличник» · ${store.config.priceRub} ₽ · пробно — 1 раз в неделю`),
      ),
    ),
    h('section', { class: 'band band--tight' }, h('div', { class: 'wrap', style: { maxWidth: '980px' } },
      h('div', { class: 'card card--xl stack' },
        h('div', { class: 'field' }, h('span', null, 'Предмет'), subjectChips),
        h('div', { class: 'field' }, h('span', null, 'Формат'), modeChips),
        h('label', { class: 'field' }, h('span', null, 'Условие'), problem),
        h('div', { class: 'row' }, solveBtn, hintBtn, resetBtn),
        status,
        !store.config.aiEnabled
          ? h('p', { class: 'notice' }, 'Решатель ещё не подключён к ИИ: администратору нужно указать ключ Claude API. Пока наставник доступен для задач из каталога.')
          : null,
      ),
      h('div', { class: 'tutor tutor--page', style: { marginTop: '24px' } }, tutor.el, followForm),
    )),
  );
  renderButtons();
  return view;
}
