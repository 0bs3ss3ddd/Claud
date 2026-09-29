// Мини-конструктор DOM. Строки всегда вставляются как текст (textContent),
// HTML — только через явное поле trustedHtml для уже санированной разметки.
export function h(tag, props = null, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === null || value === undefined || value === false) continue;
      if (key === 'class') el.className = value;
      else if (key === 'text') el.textContent = value;
      else if (key === 'trustedHtml') el.innerHTML = value;
      else if (key === 'style' && typeof value === 'object') {
        for (const [prop, v] of Object.entries(value)) {
          if (prop.startsWith('--')) el.style.setProperty(prop, v);
          else el.style[prop] = v;
        }
      }
      else if (key === 'dataset') Object.assign(el.dataset, value);
      else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
      else if (value === true) el.setAttribute(key, '');
      else el.setAttribute(key, String(value));
    }
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false || child === true) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

/** Встраивает статичную SVG-разметку из нашего кода (не пользовательский ввод). */
export function svgFragment(markup) {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild;
}

export function clear(el) {
  while (el.firstChild) el.firstChild.remove();
  return el;
}

export const plural = (n, one, few, many) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

export function formatDate(ts, withTime = false) {
  const d = new Date(ts);
  const opts = { day: 'numeric', month: 'long', timeZone: 'Europe/Moscow' };
  if (withTime) Object.assign(opts, { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleString('ru-RU', opts);
}

export function storage(kind = 'session') {
  const s = () => (kind === 'local' ? window.localStorage : window.sessionStorage);
  return {
    get(key) {
      try { const v = s().getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
    },
    set(key, value) {
      try { s().setItem(key, JSON.stringify(value)); } catch { /* приватный режим */ }
    },
    remove(key) {
      try { s().removeItem(key); } catch { /* ignore */ }
    },
  };
}

/** Переход внутри SPA (роутер слушает событие в main.js). */
export function go(to) {
  window.dispatchEvent(new CustomEvent('parta:navigate', { detail: to }));
}
