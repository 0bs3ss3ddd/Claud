// Загрузка учебного контента и разделение на публичную и платную части.
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compile } from '../public/js/lib/expr.js';
import { renderMarkdown } from '../public/js/lib/markdown.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SUBJECTS_DIR = path.join(here, '..', 'content', 'subjects');

export const COLORS = ['blue', 'mint', 'lavender', 'ember', 'sun', 'violet', 'black'];
const SUBJECT_COLORS = COLORS.filter((c) => c !== 'black');
// Порядок предметов в каталоге
const ORDER = ['math', 'mathb', 'rus', 'phys', 'inf', 'chem', 'bio', 'hist', 'soc', 'geo', 'lit', 'en'];
const ID_RE = /^[a-z][a-z0-9]{1,15}$/;
const TASK_ID_RE = /^[eo][a-z0-9]{1,15}$/;

function isStr(v, max = 20000) {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= max;
}

function checkMarkdown(md, where, errors) {
  const { viz } = renderMarkdown(md);
  viz.forEach((v, i) => {
    const at = `${where}: блок ${v.type} #${i + 1}`;
    if (v.error) return errors.push(`${at}: ${v.error}`);
    if (v.pending) return errors.push(`${at}: не закрыт «:::»`);
    const d = v.data;
    if (v.type === 'graph') {
      for (const f of d.functions ?? []) {
        try { compile(f.f); } catch (e) { errors.push(`${at}: функция «${f.f}»: ${e.message}`); }
        if (f.color && !COLORS.includes(f.color)) errors.push(`${at}: неизвестный цвет ${f.color}`);
      }
      for (const key of ['x', 'y']) {
        if (d[key] && !(Array.isArray(d[key]) && d[key].length === 2 && d[key][0] < d[key][1])) {
          errors.push(`${at}: диапазон ${key} должен быть [min, max]`);
        }
      }
      for (const p of d.points ?? []) {
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) errors.push(`${at}: точка без координат`);
      }
      for (const poly of d.polygons ?? []) {
        if (poly.fill && !COLORS.includes(poly.fill)) errors.push(`${at}: неизвестный цвет ${poly.fill}`);
      }
    } else if (v.type === 'chart') {
      if (!Array.isArray(d.labels) || !Array.isArray(d.values) || d.labels.length !== d.values.length) {
        errors.push(`${at}: labels и values должны быть массивами одной длины`);
      } else if (!d.values.every(Number.isFinite)) {
        errors.push(`${at}: values должны быть числами`);
      }
    } else if (v.type === 'map') {
      const ok = (ll) => Array.isArray(ll) && ll.length === 2 && Math.abs(ll[0]) <= 90 && Math.abs(ll[1]) <= 180;
      if (!ok(d.center)) errors.push(`${at}: center должен быть [lat, lng]`);
      for (const m of d.markers ?? []) if (!ok([m.lat, m.lng])) errors.push(`${at}: маркер «${m.label}» без координат`);
      for (const p of d.paths ?? []) if (!Array.isArray(p.points) || !p.points.every(ok)) errors.push(`${at}: путь с неверными точками`);
    } else if (v.type === 'image') {
      if (!isStr(d.wiki, 200)) errors.push(`${at}: нужен wiki — название статьи Википедии`);
    }
  });
}

export function validateSubject(s, fileId) {
  const errors = [];
  const where = `[${fileId}]`;
  if (s?.id !== fileId) errors.push(`${where} id должен совпадать с именем файла`);
  if (!ID_RE.test(s?.id ?? '')) errors.push(`${where} некорректный id`);
  for (const key of ['name', 'display', 'tagline', 'sticker', 'sdamgia']) {
    if (!isStr(s?.[key], 300)) errors.push(`${where} нет поля ${key}`);
  }
  if (!SUBJECT_COLORS.includes(s?.color)) errors.push(`${where} color должен быть одним из ${SUBJECT_COLORS.join(', ')}`);
  if (s?.sdamgia && !/^https:\/\/[a-z]+-ege\.sdamgia\.ru$/.test(s.sdamgia)) errors.push(`${where} sdamgia — https://<предмет>-ege.sdamgia.ru`);
  if (!s?.exam || !Number.isInteger(s.exam.tasks) || !isStr(s.exam.duration, 40)) errors.push(`${where} exam.tasks/duration`);
  if (!Array.isArray(s?.structure) && !Array.isArray(s?.sections)) errors.push(`${where} нужен structure или sections`);
  for (const [i, t] of (s?.theory ?? []).entries()) {
    if (!isStr(t.title, 120) || !isStr(t.body)) errors.push(`${where} theory[${i}]`);
    else checkMarkdown(t.body, `${where} theory «${t.title}»`, errors);
  }
  const ids = new Set();
  for (const t of s?.tasks ?? []) {
    const tw = `${where} задача ${t.id}`;
    if (!TASK_ID_RE.test(t.id ?? '')) errors.push(`${tw}: id вида e4 / o1`);
    if (ids.has(t.id)) errors.push(`${tw}: повтор id`);
    ids.add(t.id);
    if (!['ege', 'olymp'].includes(t.kind)) errors.push(`${tw}: kind`);
    if (t.kind === 'ege' && !t.id.startsWith('e')) errors.push(`${tw}: ЕГЭ-задачи начинаются с e`);
    if (t.kind === 'olymp' && !t.id.startsWith('o')) errors.push(`${tw}: олимпиадные задачи начинаются с o`);
    for (const key of ['title', 'level', 'statement', 'short', 'full']) {
      if (!isStr(t[key])) errors.push(`${tw}: нет ${key}`);
    }
    if (!Array.isArray(t.hints) || t.hints.length < 1 || !t.hints.every((h) => isStr(h))) errors.push(`${tw}: нужны hints`);
    if (t.answer !== null && !isStr(t.answer, 200)) errors.push(`${tw}: answer — строка или null`);
    if (t.unordered !== undefined && (t.unordered !== true || !/^\d{2,}$/.test(t.answer ?? ''))) errors.push(`${tw}: unordered: true — только для ответа-набора цифр`);
    for (const key of ['statement', 'short', 'full']) if (isStr(t[key])) checkMarkdown(t[key], `${tw}.${key}`, errors);
    for (const h of t.hints ?? []) if (isStr(h)) checkMarkdown(h, `${tw}.hint`, errors);
  }
  const o = s?.olymp;
  if (!o || !isStr(o.intro) || !isStr(o.vsosh) || !Array.isArray(o.rsosh) || !Array.isArray(o.topics) || !Array.isArray(o.links)) {
    errors.push(`${where} olymp: intro, vsosh, rsosh[], topics[], links[]`);
  } else {
    for (const l of o.links) if (!/^https:\/\//.test(l.url ?? '') || !isStr(l.title, 200)) errors.push(`${where} olymp.links: ${l.title}`);
    for (const r of o.rsosh) if (!isStr(r.name, 200)) errors.push(`${where} olymp.rsosh без name`);
  }
  if (!(s?.tasks ?? []).some((t) => t.kind === 'ege')) errors.push(`${where} нет задач ЕГЭ`);
  if (!(s?.tasks ?? []).some((t) => t.kind === 'olymp')) errors.push(`${where} нет олимпиадных задач`);
  return errors;
}

export async function loadSubjects(dir = SUBJECTS_DIR) {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.js')).sort();
  const subjects = [];
  const errors = [];
  for (const file of files) {
    const id = file.replace(/\.js$/, '');
    const mod = await import(pathToFileURL(path.join(dir, file)).href);
    const s = mod.default;
    errors.push(...validateSubject(s, id));
    subjects.push(s);
  }
  subjects.sort((a, b) => {
    const ia = ORDER.indexOf(a.id);
    const ib = ORDER.indexOf(b.id);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  return { subjects, errors };
}

function publicTask(t) {
  const { hints, full, ...rest } = t;
  return { ...rest, hintsCount: hints.length, hasFull: Boolean(full) };
}

export function createContentStore(subjects) {
  const byId = new Map(subjects.map((s) => [s.id, s]));

  const list = subjects.map((s) => ({
    id: s.id,
    name: s.name,
    display: s.display,
    color: s.color,
    sticker: s.sticker,
    tagline: s.tagline,
    examTasks: s.exam.tasks,
    egeCount: s.tasks.filter((t) => t.kind === 'ege').length,
    olympCount: s.tasks.filter((t) => t.kind === 'olymp').length,
  }));

  const publicSubjects = new Map(
    subjects.map((s) => [s.id, { ...s, tasks: s.tasks.map(publicTask) }]),
  );

  return {
    list: () => list,
    publicSubject: (id) => publicSubjects.get(id) ?? null,
    subject: (id) => byId.get(id) ?? null,
    task(subjectId, taskId) {
      const s = byId.get(subjectId);
      return s?.tasks.find((t) => t.id === taskId) ?? null;
    },
  };
}
