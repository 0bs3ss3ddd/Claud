// Сборка Express-приложения. Вынесено отдельно от index.js, чтобы тесты
// могли поднимать приложение с тестовой базой и подменёнными зависимостями.
import express from 'express';
import path from 'node:path';
import { ROOT } from './config.js';
import { openDb } from './db.js';
import { createAuth, requireUser } from './auth.js';
import { createAccess } from './access.js';
import { loadSubjects, createContentStore } from './content.js';
import { createTutor } from './tutor.js';
import { createPayments } from './payments.js';
import { createMedia } from './media.js';
import { securityHeaders, permissionsPolicy, csrfGuard, limiters } from './security.js';

export async function createApp(config, { fetchImpl = fetch, log = console, db: externalDb } = {}) {
  const db = externalDb ?? openDb(config.dbPath);
  const { subjects, errors } = await loadSubjects();
  if (errors.length) {
    log.error('[content] ошибки в учебном контенте:\n' + errors.join('\n'));
    if (config.production) throw new Error('Некорректный учебный контент');
  }
  const content = createContentStore(subjects);
  const auth = createAuth(db, config);
  const access = createAccess(db, config);
  const tutor = createTutor({ config, content, access, log });
  const payments = createPayments({ db, config, access, fetchImpl, log });
  const media = createMedia({ db, config, fetchImpl });
  const limit = limiters(config.rateLimitScale);

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.use(securityHeaders(config));
  app.use(permissionsPolicy);

  // ---------- API ----------
  const api = express.Router();
  api.use(limit.api);
  api.use(express.json({ limit: '128kb' }));
  api.use(auth.session);
  api.use(csrfGuard(config));
  api.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

  api.get('/health', (_req, res) => res.json({ ok: true }));

  api.get('/config', (_req, res) => {
    res.json({
      brand: config.brand,
      priceRub: config.plan.priceRub,
      periodDays: config.plan.periodDays,
      trialMessages: config.plan.trialMessages,
      aiEnabled: tutor.aiEnabled,
      payments: payments.mode,
    });
  });

  api.get('/me', (req, res) => {
    const user = req.user ? { id: req.user.id, email: req.user.email, name: req.user.name } : null;
    res.json({ user, access: access.status(req.user) });
  });

  api.post('/auth/register', limit.auth, auth.register);
  api.post('/auth/login', limit.auth, auth.login);
  api.post('/auth/logout', auth.logout);
  api.post('/auth/logout-others', auth.logoutOthers);

  api.get('/subjects', (_req, res) => res.json({ subjects: content.list() }));
  api.get('/subjects/:id', (req, res) => {
    const s = content.publicSubject(String(req.params.id));
    if (!s) return res.status(404).json({ error: 'Предмет не найден' });
    res.json({ subject: s });
  });

  api.get('/media/wiki', limit.media, media.handle);

  api.post('/tutor', limit.tutor, tutor.handle);

  // Webhook ЮKassa: без CSRF-заголовка (его шлёт сервер ЮKassa), статус сверяется через API.
  api.post('/payments', limit.payments, requireUser, payments.create);
  api.get('/payments', requireUser, payments.list);
  api.get('/payments/:id', limit.payments, requireUser, payments.status);
  api.post('/payments/:id/demo-confirm', limit.payments, requireUser, payments.demoConfirm);

  api.use((_req, res) => res.status(404).json({ error: 'Не найдено' }));

  const webhook = express.Router();
  webhook.use(express.json({ limit: '64kb' }));
  webhook.post('/yookassa', limit.payments, payments.webhook);

  app.use('/api/webhooks', webhook);
  app.use('/api', api);

  // ---------- Статика ----------
  const staticOpts = (maxAge) => ({ index: false, dotfiles: 'ignore', fallthrough: true, maxAge });
  app.use('/vendor/katex', express.static(path.join(ROOT, 'node_modules/katex/dist'), staticOpts('30d')));
  app.use('/vendor/leaflet', express.static(path.join(ROOT, 'node_modules/leaflet/dist'), staticOpts('30d')));
  app.use('/fonts/unbounded', express.static(path.join(ROOT, 'node_modules/@fontsource/unbounded/files'), staticOpts('30d')));
  app.use('/fonts/onest', express.static(path.join(ROOT, 'node_modules/@fontsource/onest/files'), staticOpts('30d')));
  app.use(express.static(path.join(ROOT, 'public'), staticOpts(config.production ? '1h' : 0)));

  // SPA: все остальные GET-адреса отдают index.html
  const indexFile = path.join(ROOT, 'public', 'index.html');
  app.get(/^\/(?!api\/|vendor\/|fonts\/).*/, (req, res, next) => {
    if (path.extname(req.path)) return next();
    res.set('Cache-Control', 'no-cache');
    res.sendFile(indexFile);
  });

  app.use((_req, res) => res.status(404).type('text/plain').send('Не найдено'));

  // Ошибки: без стек-трейсов наружу
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Некорректный JSON' });
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Слишком большой запрос' });
    log.error('[app]', req.method, req.path, err);
    if (res.headersSent) return res.end();
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  });

  return { app, db, content, access, payments, tutor };
}
