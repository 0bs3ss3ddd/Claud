// Markdown → DOM: безопасный рендер + KaTeX + визуализации.
import katex from '/vendor/katex/katex.mjs';
import { renderMarkdown } from './lib/markdown.js';
import { hydrateViz } from './viz.js';
import { h } from './dom.js';

let cssLoaded = false;
function ensureKatexCss() {
  if (cssLoaded) return;
  cssLoaded = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/vendor/katex/katex.min.css';
  document.head.append(link);
}

/** Создаёт блок .prose с отрендеренным markdown. */
export function md(source, className = '') {
  const el = h('div', { class: `prose ${className}`.trim() });
  setMd(el, source);
  return el;
}

/** Перерисовывает содержимое (используется и при потоковой печати ответа). */
export function setMd(el, source, { final = true } = {}) {
  ensureKatexCss();
  const { html, viz } = renderMarkdown(source, { katex });
  el.innerHTML = html; // html собран из экранированного текста — см. lib/markdown.js
  if (final) hydrateViz(el, viz);
  else hydrateViz(el, viz.map((v) => (v.type === 'graph' || v.type === 'chart' ? v : { ...v, pending: true })));
  return el;
}

/** Текст без разметки — для превью карточек. */
export function plainText(source, max = 180) {
  const t = String(source ?? '')
    .replace(/^\s*:::[\s\S]*?^\s*:::\s*$/gm, ' ')
    .replace(/\$\$?([^$]+)\$\$?/g, (_, tex) => tex.replace(/\\[a-zA-Z]+/g, ' ').replace(/[{}]/g, ''))
    .replace(/[*#>|`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}
