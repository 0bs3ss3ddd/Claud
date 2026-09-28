// Заголовки безопасности, защита от CSRF и ограничение частоты запросов.
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

export function securityHeaders(config) {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        // KaTeX и Leaflet выставляют inline-стили (размеры формул, позиционирование тайлов)
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://upload.wikimedia.org', 'https://tile.openstreetmap.org'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        mediaSrc: ["'none'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        baseUri: ["'self'"],
        workerSrc: ["'none'"],
        manifestSrc: ["'self'"],
        ...(config.production ? { upgradeInsecureRequests: [] } : {}),
      },
    },
    crossOriginEmbedderPolicy: false, // тайлы карт и картинки Википедии без CORP-заголовков
    crossOriginResourcePolicy: { policy: 'same-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    strictTransportSecurity: config.production ? { maxAge: 31536000, includeSubDomains: true } : false,
  });
}

export function permissionsPolicy(_req, res, next) {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()');
  next();
}

/**
 * CSRF: все изменяющие запросы к API обязаны нести заголовок X-Parta: 1
 * (его нельзя выставить из чужой HTML-формы, а CORS мы не разрешаем) и,
 * если браузер прислал Origin, он должен совпадать с нашим.
 */
export function csrfGuard(config) {
  const allowed = new URL(config.publicUrl).origin;
  return (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    if (req.headers['x-parta'] !== '1') return res.status(403).json({ error: 'Запрос отклонён' });
    const origin = req.headers.origin;
    if (origin) {
      let host = null;
      try { host = new URL(origin).host; } catch { /* некорректный Origin */ }
      if (origin !== allowed && host !== req.headers.host) return res.status(403).json({ error: 'Запрос отклонён' });
    }
    next();
  };
}

const json429 = (message) => (_req, res) => res.status(429).json({ error: message });

export function limiters(scale = 1) {
  const base = { standardHeaders: 'draft-8', legacyHeaders: false };
  const n = (v) => Math.max(1, Math.round(v * scale));
  return {
    api: rateLimit({ ...base, windowMs: 15 * 60 * 1000, limit: n(600), handler: json429('Слишком много запросов, подожди немного') }),
    auth: rateLimit({ ...base, windowMs: 15 * 60 * 1000, limit: n(20), handler: json429('Слишком много попыток входа. Попробуй через 15 минут') }),
    register: rateLimit({ ...base, windowMs: 24 * 60 * 60 * 1000, limit: n(30), handler: json429('Слишком много регистраций из этой сети за сутки. Попробуй завтра') }),
    tutor: rateLimit({ ...base, windowMs: 60 * 1000, limit: n(12), handler: json429('Не так быстро — наставник ещё думает над прошлым вопросом') }),
    payments: rateLimit({ ...base, windowMs: 15 * 60 * 1000, limit: n(30), handler: json429('Слишком много запросов к оплате') }),
    media: rateLimit({ ...base, windowMs: 60 * 1000, limit: n(60), handler: json429('Слишком много запросов картинок') }),
  };
}
