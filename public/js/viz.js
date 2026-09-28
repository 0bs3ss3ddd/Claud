// Визуальные блоки в разборах: графики/чертежи (SVG), диаграммы, карты (Leaflet), картины (Википедия).
// Все подписи вставляются через textContent; URL картинок приходят только с нашего сервера.
import { compile } from './lib/expr.js';
import { h } from './dom.js';
import { api } from './api.js';

const NS = 'http://www.w3.org/2000/svg';
const COLORS = {
  blue: '#4da2ff', mint: '#55db9c', lavender: '#e9ccff', ember: '#fb4903',
  sun: '#ffd731', violet: '#5c4ade', black: '#000000',
};
const LINE_ORDER = ['blue', 'ember', 'violet', 'mint', 'black', 'sun'];
const color = (name, i = 0) => COLORS[name] ?? COLORS[LINE_ORDER[i % LINE_ORDER.length]];
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const str = (v, max = 120) => (typeof v === 'string' ? v.slice(0, max) : '');

function s(tag, attrs = {}, text) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) el.setAttribute(k, String(v));
  if (text !== undefined) el.textContent = text;
  return el;
}

function niceStep(range, target = 8) {
  const raw = range / target;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * pow;
}
const fmt = (v) => {
  const r = Math.abs(v) < 1e-10 ? 0 : Number(v.toPrecision(6));
  return String(r).replace('.', ',').replace('-', '−');
};

function frame(title, body, legend) {
  const box = h('div', { class: 'viz' });
  if (title) box.append(h('div', { class: 'viz__title', text: title }));
  box.append(h('div', { class: 'viz__body' }, body));
  if (legend?.length) box.append(h('div', { class: 'viz__legend' }, legend));
  return box;
}

function errorBox(message) {
  return h('div', { class: 'viz viz--error', text: message });
}

// ---------- График / чертёж ----------
export function renderGraph(d) {
  const fns = (Array.isArray(d.functions) ? d.functions : []).slice(0, 8).map((f, i) => {
    try {
      return { fn: compile(String(f.f)), label: str(f.label) || `y = ${str(f.f)}`, color: color(f.color, i), domain: Array.isArray(f.domain) ? f.domain.map(Number) : null, dashed: Boolean(f.dashed) };
    } catch (e) {
      return { error: `Функция «${str(f.f, 60)}»: ${e.message}` };
    }
  });
  const bad = fns.find((f) => f.error);
  if (bad) return errorBox(bad.error);

  const points = (Array.isArray(d.points) ? d.points : []).slice(0, 60).filter((p) => Number.isFinite(p?.x) && Number.isFinite(p?.y));
  let [x0, x1] = Array.isArray(d.x) && d.x[0] < d.x[1] ? d.x.map(Number) : [-10, 10];
  let y0;
  let y1;
  if (Array.isArray(d.y) && d.y[0] < d.y[1]) [y0, y1] = d.y.map(Number);
  else {
    const ys = points.map((p) => p.y);
    for (const f of fns) for (let i = 0; i <= 100; i++) {
      const x = x0 + ((x1 - x0) * i) / 100;
      const y = f.fn(x);
      if (Number.isFinite(y)) ys.push(y);
    }
    y0 = ys.length ? Math.min(...ys) : -10;
    y1 = ys.length ? Math.max(...ys) : 10;
    if (y1 - y0 < 1e-6) { y0 -= 1; y1 += 1; }
    const pad = (y1 - y0) * 0.1;
    y0 -= pad; y1 += pad;
  }
  const LIM = 1e6;
  if (![x0, x1, y0, y1].every((v) => Number.isFinite(v) && Math.abs(v) <= LIM) || x1 - x0 < 1e-6 || y1 - y0 < 1e-6) {
    return errorBox('Недопустимый диапазон графика');
  }

  const W = 640;
  const P = 34;
  let H = 400;
  if (d.equal) H = Math.max(220, Math.min(760, Math.round((W - 2 * P) * ((y1 - y0) / (x1 - x0)) + 2 * P)));
  const X = (x) => P + ((x - x0) / (x1 - x0)) * (W - 2 * P);
  const Y = (y) => H - P - ((y - y0) / (y1 - y0)) * (H - 2 * P);

  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': str(d.title) || 'График' });
  const clipId = `clip${Math.random().toString(36).slice(2, 8)}`;
  const defs = s('defs');
  const clip = s('clipPath', { id: clipId });
  clip.append(s('rect', { x: P, y: P, width: W - 2 * P, height: H - 2 * P }));
  defs.append(clip);
  svg.append(defs);
  svg.append(s('rect', { x: P, y: P, width: W - 2 * P, height: H - 2 * P, fill: '#fff', stroke: '#000', 'stroke-width': 1 }));

  const showGrid = d.grid !== false;
  const showAxes = d.axes !== false;
  const sx = niceStep(x1 - x0);
  const sy = d.equal ? sx : niceStep(y1 - y0, 6);
  const grid = s('g', { stroke: '#e9e9e9', 'stroke-width': 1 });
  const labels = s('g', { 'font-size': 11, 'font-family': 'Onest, sans-serif', fill: '#000' });
  for (let k = 0, x = Math.ceil(x0 / sx) * sx; x <= x1 + 1e-9 && k < 60; k++, x = Math.ceil(x0 / sx) * sx + k * sx) {
    if (showGrid) grid.append(s('line', { x1: X(x), x2: X(x), y1: P, y2: H - P }));
    if (showAxes && Math.abs(x) > sx / 1000) labels.append(s('text', { x: X(x), y: Math.min(H - P - 4, Math.max(P + 12, Y(0) + 14)), 'text-anchor': 'middle' }, fmt(x)));
  }
  for (let k = 0, y = Math.ceil(y0 / sy) * sy; y <= y1 + 1e-9 && k < 60; k++, y = Math.ceil(y0 / sy) * sy + k * sy) {
    if (showGrid) grid.append(s('line', { y1: Y(y), y2: Y(y), x1: P, x2: W - P }));
    if (showAxes && Math.abs(y) > sy / 1000) labels.append(s('text', { x: Math.min(W - P - 4, Math.max(P + 4, X(0) - 6)), y: Y(y) + 4, 'text-anchor': X(0) - 6 < P + 20 ? 'start' : 'end' }, fmt(y)));
  }
  svg.append(grid);

  const plot = s('g', { 'clip-path': `url(#${clipId})` });
  if (showAxes) {
    const axes = s('g', { stroke: '#000', 'stroke-width': 1.5 });
    if (y0 <= 0 && y1 >= 0) axes.append(s('line', { x1: P, x2: W - P, y1: Y(0), y2: Y(0) }));
    if (x0 <= 0 && x1 >= 0) axes.append(s('line', { y1: P, y2: H - P, x1: X(0), x2: X(0) }));
    plot.append(axes);
  }

  for (const poly of (Array.isArray(d.polygons) ? d.polygons : []).slice(0, 80)) {
    const pts = (Array.isArray(poly.points) ? poly.points : []).filter((p) => Array.isArray(p) && p.every(Number.isFinite));
    if (pts.length < 3) continue;
    plot.append(s('polygon', { points: pts.map(([x, y]) => `${X(x)},${Y(y)}`).join(' '), fill: color(poly.fill ?? 'lavender'), 'fill-opacity': poly.fill === 'black' ? 0.85 : 0.75, stroke: '#000', 'stroke-width': 1.2 }));
  }
  for (const c of (Array.isArray(d.circles) ? d.circles : []).slice(0, 20)) {
    if (!Array.isArray(c.center) || !Number.isFinite(c.r)) continue;
    const [cx, cy] = c.center.map(num);
    plot.append(s('ellipse', { cx: X(cx), cy: Y(cy), rx: Math.abs(X(cx + c.r) - X(cx)), ry: Math.abs(Y(cy + c.r) - Y(cy)), fill: c.fill ? color(c.fill) : 'none', 'fill-opacity': 0.5, stroke: color(c.color ?? 'black'), 'stroke-width': 2 }));
  }
  for (const v of (Array.isArray(d.vlines) ? d.vlines : []).slice(0, 12)) if (Number.isFinite(v)) plot.append(s('line', { x1: X(v), x2: X(v), y1: P, y2: H - P, stroke: '#000', 'stroke-dasharray': '5 5' }));
  for (const v of (Array.isArray(d.hlines) ? d.hlines : []).slice(0, 12)) if (Number.isFinite(v)) plot.append(s('line', { y1: Y(v), y2: Y(v), x1: P, x2: W - P, stroke: '#000', 'stroke-dasharray': '5 5' }));

  const legend = [];
  fns.forEach((f) => {
    const [a, b] = f.domain && f.domain[0] < f.domain[1] ? [Math.max(x0, f.domain[0]), Math.min(x1, f.domain[1])] : [x0, x1];
    const steps = 600;
    let dPath = '';
    let pen = false;
    let prevY = null;
    for (let i = 0; i <= steps; i++) {
      const x = a + ((b - a) * i) / steps;
      const y = f.fn(x);
      const ok = Number.isFinite(y) && y > y0 - (y1 - y0) * 4 && y < y1 + (y1 - y0) * 4;
      const jump = prevY !== null && Math.abs(y - prevY) > (y1 - y0) * 2;
      if (!ok || jump) { pen = false; prevY = ok ? y : null; if (!ok) continue; }
      dPath += `${pen ? 'L' : 'M'}${X(x).toFixed(2)},${Y(y).toFixed(2)}`;
      pen = true;
      prevY = y;
    }
    plot.append(s('path', { d: dPath, fill: 'none', stroke: f.color, 'stroke-width': 3, 'stroke-linejoin': 'round', 'stroke-dasharray': f.dashed ? '8 6' : null }));
    legend.push(h('span', null, h('i', { style: { background: f.color } }), f.label));
  });

  for (const seg of (Array.isArray(d.segments) ? d.segments : []).slice(0, 60)) {
    if (!Array.isArray(seg.from) || !Array.isArray(seg.to)) continue;
    plot.append(s('line', { x1: X(num(seg.from[0])), y1: Y(num(seg.from[1])), x2: X(num(seg.to[0])), y2: Y(num(seg.to[1])), stroke: color(seg.color ?? 'black'), 'stroke-width': 2, 'stroke-dasharray': seg.dashed ? '6 5' : null, 'stroke-linecap': 'round' }));
  }
  svg.append(plot);
  svg.append(labels);

  const dots = s('g', { 'font-size': 13, 'font-weight': 700, 'font-family': 'Onest, sans-serif' });
  for (const p of points) {
    if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
    dots.append(s('circle', { cx: X(p.x), cy: Y(p.y), r: 5, fill: color(p.color ?? 'ember'), stroke: '#000', 'stroke-width': 1.5 }));
    const label = str(p.label, 40);
    if (label) {
      const tx = X(p.x) + 9;
      const anchor = tx > W - 120 ? 'end' : 'start';
      const t = s('text', { x: anchor === 'end' ? X(p.x) - 9 : tx, y: Y(p.y) - 9, 'text-anchor': anchor, stroke: '#fff', 'stroke-width': 4, 'paint-order': 'stroke' }, label);
      dots.append(t);
    }
  }
  svg.append(dots);
  return frame(str(d.title), svg, legend);
}

// ---------- Столбчатая диаграмма ----------
export function renderChart(d) {
  const labels = (Array.isArray(d.labels) ? d.labels : []).slice(0, 24).map((l) => str(String(l), 30));
  const values = (Array.isArray(d.values) ? d.values : []).slice(0, labels.length).map(num);
  if (!labels.length || labels.length !== values.length) return errorBox('Диаграмма без данных');
  const unit = str(d.unit, 10);
  const W = 640;
  const H = 320;
  const P = { t: 30, r: 16, b: 46, l: 16 };
  const max = Math.max(0, ...values);
  const min = Math.min(0, ...values);
  const span = max - min || 1;
  const Y = (v) => P.t + ((max - v) / span) * (H - P.t - P.b);
  const bw = (W - P.l - P.r) / labels.length;
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': str(d.title) || 'Диаграмма' });
  svg.append(s('line', { x1: P.l, x2: W - P.r, y1: Y(0), y2: Y(0), stroke: '#000', 'stroke-width': 1.5 }));
  const g = s('g', { 'font-family': 'Onest, sans-serif', 'font-size': 12, 'font-weight': 700 });
  values.forEach((v, i) => {
    const x = P.l + i * bw + bw * 0.15;
    const w = bw * 0.7;
    const top = Math.min(Y(v), Y(0));
    const hgt = Math.max(1, Math.abs(Y(v) - Y(0)));
    g.append(s('rect', { x, y: top, width: w, height: hgt, rx: Math.min(10, w / 4), fill: color(LINE_ORDER[i % LINE_ORDER.length] === 'black' ? 'lavender' : LINE_ORDER[i % LINE_ORDER.length]), stroke: '#000', 'stroke-width': 1.2 }));
    g.append(s('text', { x: x + w / 2, y: v >= 0 ? top - 7 : top + hgt + 15, 'text-anchor': 'middle' }, `${fmt(v)}${unit ? ' ' + unit : ''}`));
    g.append(s('text', { x: x + w / 2, y: H - P.b + 20, 'text-anchor': 'middle', 'font-weight': 500 }, labels[i]));
  });
  svg.append(g);
  return frame(str(d.title), svg);
}

// ---------- Карта ----------
let leafletPromise = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  leafletPromise ??= new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = '/vendor/leaflet/leaflet.css';
    document.head.append(css);
    const js = document.createElement('script');
    js.src = '/vendor/leaflet/leaflet.js';
    js.onload = () => resolve(window.L);
    js.onerror = () => { leafletPromise = null; reject(new Error('Карта не загрузилась')); };
    document.head.append(js);
  });
  return leafletPromise;
}
const okLL = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

export function renderMap(d) {
  const mapEl = h('div', { class: 'viz__map', role: 'region', 'aria-label': str(d.title) || 'Карта' });
  const box = frame(str(d.title), mapEl);
  const markers = (Array.isArray(d.markers) ? d.markers : []).slice(0, 40).filter((m) => okLL(num(m.lat, NaN), num(m.lng, NaN)));
  const paths = (Array.isArray(d.paths) ? d.paths : []).slice(0, 10).map((p) => (Array.isArray(p.points) ? p.points : []).filter((ll) => Array.isArray(ll) && okLL(num(ll[0], NaN), num(ll[1], NaN))).map((ll) => [Number(ll[0]), Number(ll[1])]));
  const labelsOfPaths = (Array.isArray(d.paths) ? d.paths : []).slice(0, 10).map((p) => str(p.label, 80));
  const legend = h('div', { class: 'viz__legend' });
  markers.forEach((m) => legend.append(h('span', null, h('i', { style: { background: COLORS.ember, height: '10px', width: '10px', borderRadius: '50%', border: '1px solid #000' } }), `${str(m.label, 60)}${m.note ? ` — ${str(m.note, 100)}` : ''}`)));
  labelsOfPaths.forEach((l) => l && legend.append(h('span', null, h('i', { style: { background: COLORS.violet } }), l)));
  if (legend.childNodes.length) box.append(legend);

  loadLeaflet().then((L) => {
    const center = Array.isArray(d.center) && okLL(num(d.center[0], NaN), num(d.center[1], NaN)) ? d.center.map(Number) : [55.75, 37.62];
    const map = L.map(mapEl, { scrollWheelZoom: false, attributionControl: true }).setView(center, Math.min(12, Math.max(2, num(d.zoom, 5))));
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 16,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }).addTo(map);
    const bounds = [];
    paths.forEach((pts) => {
      if (pts.length < 2) return;
      L.polyline(pts, { color: COLORS.violet, weight: 5, opacity: 0.9, dashArray: '10 8' }).addTo(map);
      bounds.push(...pts);
    });
    markers.forEach((m) => {
      const ll = [Number(m.lat), Number(m.lng)];
      const cm = L.circleMarker(ll, { radius: 9, color: '#000', weight: 1.5, fillColor: COLORS.ember, fillOpacity: 1 }).addTo(map);
      const tip = document.createElement('span');
      tip.textContent = str(m.label, 60);
      cm.bindTooltip(tip, { permanent: true, direction: 'top', offset: [0, -8], className: 'map-label' });
      if (m.note) {
        const pop = document.createElement('span');
        pop.textContent = str(m.note, 200);
        cm.bindPopup(pop);
      }
      bounds.push(ll);
    });
    if (bounds.length > 1 && !d.zoom) map.fitBounds(bounds, { padding: [40, 40] });
    setTimeout(() => map.invalidateSize(), 50);
  }).catch(() => {
    mapEl.replaceWith(h('div', { class: 'viz--error', text: 'Не удалось загрузить карту' }));
  });
  return box;
}

// ---------- Картина / иллюстрация ----------
export function renderImage(d) {
  const title = str(d.wiki, 200);
  const caption = str(d.caption, 200);
  const box = h('div', { class: 'viz' });
  const loading = h('div', { class: 'viz--loading', text: 'Загружаю иллюстрацию…' });
  box.append(loading);
  api(`/media/wiki?title=${encodeURIComponent(title)}`).then((m) => {
    const fig = h('figure');
    const imgOk = m?.ok && m.image?.src?.startsWith('https://upload.wikimedia.org/');
    if (imgOk) {
      fig.append(h('img', { src: m.image.src, alt: caption || m.title, loading: 'lazy', width: m.image.width, height: m.image.height, referrerpolicy: 'no-referrer' }));
    } else {
      fig.append(h('div', { class: 'viz--loading', text: `🖼 ${caption || title}` }));
    }
    const pageUrl = m?.page && /^https:\/\/(ru|en)\.wikipedia\.org\//.test(m.page)
      ? m.page
      : `https://ru.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
    fig.append(h('figcaption', null,
      h('strong', { text: caption || m?.title || title }),
      m?.description ? h('span', { class: 'muted', text: m.description }) : null,
      h('span', { class: 'caption' }, 'Источник: ', h('a', { href: pageUrl, target: '_blank', rel: 'noopener noreferrer', text: 'Википедия / Wikimedia Commons' })),
    ));
    loading.replaceWith(fig);
  }).catch(() => {
    loading.textContent = `🖼 ${caption || title} — иллюстрация недоступна`;
  });
  return box;
}

/** Заменяет плейсхолдеры [data-viz] в контейнере на готовые визуализации. */
const MAX_VIZ = 8;
export function hydrateViz(root, viz) {
  root.querySelectorAll('[data-viz]').forEach((el, i) => {
    const item = viz[Number(el.dataset.viz)];
    if (!item) return;
    let node;
    if (i >= MAX_VIZ) node = errorBox('Слишком много иллюстраций в одном ответе');
    else if (item.pending) node = h('div', { class: 'viz viz--pending', text: item.type === 'map' ? 'Рисую карту…' : item.type === 'image' ? 'Ищу иллюстрацию…' : 'Рисую чертёж…' });
    else if (item.error) node = errorBox(item.error);
    else if (item.type === 'graph') node = renderGraph(item.data);
    else if (item.type === 'chart') node = renderChart(item.data);
    else if (item.type === 'map') node = renderMap(item.data);
    else if (item.type === 'image') node = renderImage(item.data);
    if (node) el.replaceWith(node);
  });
}
