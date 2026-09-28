// Наклейки: плоские фигуры с чёрным контуром 1.5px в цветах палитры.
// Статичная разметка из кода — пользовательские данные сюда не попадают.
const S = 'stroke="#000" stroke-width="1.5" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"';
const C = {
  blue: '#4da2ff', mint: '#55db9c', lavender: '#e9ccff', ember: '#fb4903', sun: '#ffd731', violet: '#5c4ade', white: '#fff', black: '#000',
};
const T = (x, y, size, fill, text, weight = 900) =>
  `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="Unbounded, Arial Black, sans-serif" font-weight="${weight}" font-size="${size}" fill="${fill}">${text}</text>`;
const wrap = (inner) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${inner}</svg>`;

const shapes = {
  pencil: `<g transform="rotate(-35 50 50)"><rect x="18" y="38" width="56" height="24" rx="4" fill="${C.sun}" ${S}/><rect x="74" y="38" width="12" height="24" rx="4" fill="${C.lavender}" ${S}/><path d="M18 38 L4 50 L18 62 Z" fill="${C.ember}" ${S}/><path d="M9 45.8 L4 50 L9 54.2 Z" fill="${C.black}"/><path d="M26 46 H66 M26 54 H66" ${S} fill="none"/></g>`,
  coin5: `<circle cx="50" cy="50" r="42" fill="${C.sun}" ${S}/><circle cx="50" cy="50" r="31" fill="none" ${S}/>${T(50, 52, 40, C.black, '5')}`,
  atom: `<circle cx="50" cy="50" r="44" fill="${C.violet}" ${S}/><g fill="none" stroke="#fff" stroke-width="3"><ellipse cx="50" cy="50" rx="30" ry="11"/><ellipse cx="50" cy="50" rx="30" ry="11" transform="rotate(60 50 50)"/><ellipse cx="50" cy="50" rx="30" ry="11" transform="rotate(-60 50 50)"/></g><circle cx="50" cy="50" r="6" fill="${C.sun}" ${S}/>`,
  pi: `<rect x="8" y="8" width="84" height="84" rx="22" fill="${C.blue}" ${S}/><path d="M26 34 Q30 28 40 28 H76" fill="none" stroke="#000" stroke-width="8" stroke-linecap="round"/><path d="M42 30 L36 74" fill="none" stroke="#000" stroke-width="8" stroke-linecap="round"/><path d="M62 30 V66 Q62 74 72 72" fill="none" stroke="#000" stroke-width="8" stroke-linecap="round"/>`,
  letters: `<rect x="8" y="14" width="84" height="72" rx="20" fill="${C.ember}" ${S}/>${T(50, 51, 32, C.black, 'Аа')}`,
  code: `<rect x="8" y="14" width="84" height="72" rx="20" fill="${C.mint}" ${S}/>${T(50, 51, 26, C.black, '&lt;/&gt;')}`,
  flask: `<path d="M38 10 H62 V36 L84 80 Q88 90 76 90 H24 Q12 90 16 80 L38 36 Z" fill="${C.lavender}" ${S}/><path d="M27 64 H73 L80 80 Q83 86 75 86 H25 Q17 86 20 80 Z" fill="${C.mint}" ${S}/><circle cx="44" cy="74" r="4" fill="#fff" ${S}/><circle cx="58" cy="70" r="3" fill="#fff" ${S}/><path d="M34 10 H66" ${S}/>`,
  leaf: `<path d="M14 86 Q10 26 86 14 Q90 78 30 86 Z" fill="${C.mint}" ${S}/><path d="M18 82 Q46 54 76 24 M40 62 L38 44 M54 48 L66 50" fill="none" ${S}/>`,
  column: `<rect x="16" y="10" width="68" height="12" rx="3" fill="${C.sun}" ${S}/><rect x="22" y="22" width="56" height="8" fill="${C.sun}" ${S}/><rect x="28" y="30" width="44" height="46" fill="${C.sun}" ${S}/><path d="M39 32 V74 M50 32 V74 M61 32 V74" ${S}/><rect x="20" y="76" width="60" height="8" fill="${C.sun}" ${S}/><rect x="12" y="84" width="76" height="8" rx="3" fill="${C.sun}" ${S}/>`,
  scales: `<circle cx="50" cy="50" r="44" fill="${C.blue}" ${S}/><path d="M50 22 V76 M28 30 H72 M38 76 H62" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round"/><path d="M28 30 L18 56 H38 Z M72 30 L62 56 H82 Z" fill="${C.sun}" ${S}/>`,
  globe: `<circle cx="50" cy="50" r="42" fill="${C.blue}" ${S}/><path d="M24 30 Q36 22 44 32 Q40 44 30 44 Q20 42 24 30 Z M56 48 Q70 44 76 56 Q70 74 58 70 Q50 58 56 48 Z M44 70 Q50 76 44 84 Q36 80 44 70 Z" fill="${C.mint}" ${S}/><ellipse cx="50" cy="50" rx="18" ry="42" fill="none" ${S}/><path d="M8 50 H92" ${S}/>`,
  quill: `<path d="M84 10 Q40 20 26 70 L32 74 Q64 58 84 10 Z" fill="${C.lavender}" ${S}/><path d="M80 16 Q52 40 30 72" fill="none" ${S}/><path d="M26 70 L14 92" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round"/><circle cx="18" cy="90" r="5" fill="${C.violet}" ${S}/>`,
  bubble: `<path d="M16 14 H84 Q92 14 92 22 V64 Q92 72 84 72 H44 L26 88 V72 H16 Q8 72 8 64 V22 Q8 14 16 14 Z" fill="${C.violet}" ${S}/>${T(50, 43, 24, C.white, 'EN')}`,
  check: `<rect x="10" y="10" width="80" height="80" rx="24" fill="${C.mint}" ${S}/><path d="M28 52 L44 66 L74 34" fill="none" stroke="#000" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`,
  star: `<path d="M50 6 L62 36 L94 38 L69 58 L78 90 L50 72 L22 90 L31 58 L6 38 L38 36 Z" fill="${C.sun}" ${S}/>`,
  medal: `<path d="M30 6 H46 L56 40 H40 Z M70 6 H54 L44 40 H60 Z" fill="${C.ember}" ${S}/><circle cx="50" cy="64" r="28" fill="${C.sun}" ${S}/><circle cx="50" cy="64" r="19" fill="none" ${S}/>${T(50, 65, 20, C.black, '1')}`,
  rocket: `<g transform="rotate(35 50 50)"><path d="M50 6 Q70 24 68 60 H32 Q30 24 50 6 Z" fill="${C.ember}" ${S}/><circle cx="50" cy="34" r="8" fill="${C.sky || '#dceeff'}" ${S}/><path d="M32 48 L18 70 H32 Z M68 48 L82 70 H68 Z" fill="${C.violet}" ${S}/><path d="M40 60 L44 80 L50 70 L56 80 L60 60 Z" fill="${C.sun}" ${S}/></g>`,
  book: `<path d="M10 22 Q30 14 50 24 Q70 14 90 22 V82 Q70 74 50 84 Q30 74 10 82 Z" fill="${C.lavender}" ${S}/><path d="M50 24 V84 M20 34 Q30 30 40 34 M20 46 Q30 42 40 46 M60 34 Q70 30 80 34 M60 46 Q70 42 80 46" fill="none" ${S}/>`,
  bulb: `<path d="M50 8 Q78 8 80 36 Q80 52 66 62 V72 H34 V62 Q20 52 20 36 Q22 8 50 8 Z" fill="${C.sun}" ${S}/><rect x="34" y="72" width="32" height="8" rx="3" fill="${C.mint}" ${S}/><rect x="38" y="80" width="24" height="8" rx="3" fill="${C.mint}" ${S}/><path d="M42 50 L50 38 L58 50" fill="none" ${S}/>`,
  map: `<path d="M8 22 L36 12 L64 22 L92 12 V78 L64 88 L36 78 L8 88 Z" fill="${C.mint}" ${S}/><path d="M36 12 V78 M64 22 V88" fill="none" ${S}/><circle cx="50" cy="46" r="7" fill="${C.ember}" ${S}/>`,
  chart: `<rect x="8" y="10" width="84" height="80" rx="20" fill="#fff" ${S}/><rect x="22" y="50" width="12" height="28" rx="3" fill="${C.blue}" ${S}/><rect x="44" y="34" width="12" height="44" rx="3" fill="${C.ember}" ${S}/><rect x="66" y="22" width="12" height="56" rx="3" fill="${C.mint}" ${S}/>`,
  lock: `<rect x="18" y="42" width="64" height="48" rx="14" fill="${C.sun}" ${S}/><path d="M32 42 V30 Q32 12 50 12 Q68 12 68 30 V42" fill="none" stroke="#000" stroke-width="7" stroke-linecap="round"/><circle cx="50" cy="64" r="6" fill="#000"/>`,
};

export function sticker(name, extraClass = '') {
  const inner = shapes[name] ?? shapes.star;
  const t = document.createElement('template');
  t.innerHTML = `<span class="sticker ${extraClass}">${wrap(inner)}</span>`;
  return t.content.firstElementChild;
}

export const STICKERS = Object.keys(shapes);

// Надувная лента: несколько плоских обводок (тень, тело, блик) + зерно.
let ribbonId = 0;
export function ribbon(className = '', variant = 'wave') {
  const id = `grain${ribbonId++}`;
  const paths = {
    wave: 'M -80 430 C 140 640, 330 110, 600 250 S 930 560, 1080 330 S 1300 40, 1500 160',
    loop: 'M -60 200 C 200 40, 420 420, 640 330 C 860 240, 820 60, 700 90 C 560 130, 640 470, 900 470 S 1300 300, 1480 380',
    arc: 'M -80 520 C 300 60, 1100 60, 1480 520',
  };
  const d = paths[variant] ?? paths.wave;
  const t = document.createElement('template');
  t.innerHTML = `<div class="ribbon ${className}" aria-hidden="true"><svg viewBox="0 0 1400 600" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
<defs><filter id="${id}" filterUnits="userSpaceOnUse" x="-300" y="-400" width="2000" height="1400">
<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="noise"/>
<feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 -0.28" result="speckle"/>
<feComposite in="speckle" in2="SourceGraphic" operator="in" result="grain"/>
<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="grain"/></feMerge></filter></defs>
<g filter="url(#${id})" fill="none" stroke-linecap="round" stroke-linejoin="round">
<path d="${d}" stroke="#1d5fb8" stroke-width="128" transform="translate(0 10)"/>
<path d="${d}" stroke="#2f86ea" stroke-width="122" transform="translate(0 4)"/>
<path d="${d}" stroke="#4da2ff" stroke-width="110"/>
<path d="${d}" stroke="#7ab9ff" stroke-width="54" transform="translate(-4 -22)"/>
<path d="${d}" stroke="#b3d8ff" stroke-width="16" transform="translate(-8 -36)"/>
</g></svg></div>`;
  return t.content.firstElementChild;
}
