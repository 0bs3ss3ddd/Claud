// Общее состояние: конфигурация сайта, текущий пользователь и доступ, кэш предметов.
import { api } from './api.js';

const listeners = new Set();

export const store = {
  config: { brand: 'ПАРТА', priceRub: 499, periodDays: 30, trialMessages: 6, proDailyLimit: 40, aiEnabled: false, payments: 'demo' },
  user: null,
  access: { plan: 'guest' },
  subjects: null,
  subjectCache: new Map(),
};

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit() {
  for (const fn of listeners) fn(store);
}

export async function loadConfig() {
  try { store.config = { ...store.config, ...(await api('/config')) }; } catch { /* офлайн — оставляем значения по умолчанию */ }
}

export async function refreshMe() {
  try {
    const { user, access } = await api('/me');
    store.user = user;
    store.access = access;
  } catch {
    store.user = null;
    store.access = { plan: 'guest' };
  }
  emit();
  return store;
}

export function setAccess(access) {
  if (access) {
    store.access = access;
    emit();
  }
}

export async function getSubjects() {
  if (!store.subjects) store.subjects = (await api('/subjects')).subjects;
  return store.subjects;
}

export async function getSubject(id) {
  if (!store.subjectCache.has(id)) {
    const { subject } = await api(`/subjects/${encodeURIComponent(id)}`);
    store.subjectCache.set(id, subject);
  }
  return store.subjectCache.get(id);
}

export const isPro = () => store.access?.plan === 'pro';
