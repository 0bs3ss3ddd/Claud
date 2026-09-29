// Конфигурация из переменных окружения (см. .env.example).
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(here, '..');

function bool(v, def = false) {
  if (v === undefined || v === '') return def;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}
const PROVIDER_ALIASES = { anthropic: 'anthropic', claude: 'anthropic', yandexgpt: 'yandexgpt', yandex: 'yandexgpt', gigachat: 'gigachat', giga: 'gigachat', deepseek: 'deepseek' };
function providerList(v) {
  return String(v ?? '')
    .split(',')
    .map((x) => PROVIDER_ALIASES[x.trim().toLowerCase()])
    .filter((x, i, arr) => x && arr.indexOf(x) === i);
}

function int(v, def) {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) ? n : def;
}

export function loadConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const publicUrl = (env.PUBLIC_URL || `http://localhost:${int(env.PORT, 3000)}`).replace(/\/+$/, '');
  const yookassa = env.YOOKASSA_SHOP_ID && env.YOOKASSA_SECRET_KEY
    ? {
        shopId: env.YOOKASSA_SHOP_ID,
        secretKey: env.YOOKASSA_SECRET_KEY,
        sendReceipt: bool(env.YOOKASSA_SEND_RECEIPT),
        vatCode: int(env.YOOKASSA_VAT_CODE, 1),
        apiBase: env.YOOKASSA_API_BASE || 'https://api.yookassa.ru/v3',
      }
    : null;

  return {
    production,
    port: int(env.PORT, 3000),
    host: env.HOST || '0.0.0.0',
    publicUrl,
    secureCookies: bool(env.SECURE_COOKIES, publicUrl.startsWith('https://')),
    trustProxy: env.TRUST_PROXY === undefined ? false : (/^\d+$/.test(env.TRUST_PROXY) ? int(env.TRUST_PROXY, 1) : bool(env.TRUST_PROXY)),
    dbPath: env.DB_PATH || path.join(ROOT, 'data', 'parta.db'),
    brand: env.BRAND_NAME || 'ПАРТА',
    // Ключ подписи ответов наставника (HMAC). Без APP_SECRET — случайный на процесс.
    secret: env.APP_SECRET && env.APP_SECRET.length >= 32 ? env.APP_SECRET : randomBytes(32).toString('hex'),
    secretFromEnv: Boolean(env.APP_SECRET && env.APP_SECRET.length >= 32),
    // Множитель лимитов частоты запросов (для нагрузочных тестов; в проде — 1)
    rateLimitScale: Number(env.RATE_LIMIT_SCALE) > 0 ? Number(env.RATE_LIMIT_SCALE) : 1,

    anthropic: {
      apiKey: env.ANTHROPIC_API_KEY || '',
      baseURL: env.ANTHROPIC_BASE_URL || undefined,
      model: env.ANTHROPIC_MODEL || 'claude-opus-5',
      effort: ['low', 'medium', 'high', 'xhigh', 'max'].includes(env.TUTOR_EFFORT) ? env.TUTOR_EFFORT : 'high',
      maxTokens: int(env.TUTOR_MAX_TOKENS, 16000),
      // Серверный фолбэк при отказе модели: на Bedrock/Vertex отключите (false).
      fallbacks: bool(env.ANTHROPIC_FALLBACKS, true),
    },

    // Порядок ИИ-провайдеров: первый — основной, остальные — резерв. Пусто — все настроенные.
    tutorProviders: providerList(env.TUTOR_PROVIDERS),

    yandex: {
      apiKey: env.YANDEX_API_KEY || '',
      iamToken: env.YANDEX_IAM_TOKEN || '',
      folderId: env.YANDEX_FOLDER_ID || '',
      model: env.YANDEX_MODEL || 'yandexgpt/latest',
      temperature: Number.isFinite(Number(env.YANDEX_TEMPERATURE)) && env.YANDEX_TEMPERATURE !== undefined ? Number(env.YANDEX_TEMPERATURE) : 0.3,
      maxTokens: int(env.YANDEX_MAX_TOKENS, 4000),
      apiBase: (env.YANDEX_API_BASE || 'https://llm.api.cloud.yandex.net').replace(/\/+$/, ''),
    },

    gigachat: {
      authKey: env.GIGACHAT_AUTH_KEY || '',
      scope: env.GIGACHAT_SCOPE || 'GIGACHAT_API_PERS',
      model: env.GIGACHAT_MODEL || 'GigaChat-2-Max',
      maxTokens: int(env.GIGACHAT_MAX_TOKENS, 4000),
      apiBase: (env.GIGACHAT_API_BASE || 'https://gigachat.devices.sberbank.ru/api/v1').replace(/\/+$/, ''),
      authUrl: env.GIGACHAT_AUTH_URL || 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth',
      caCert: env.GIGACHAT_CA_CERT || '',
    },

    deepseek: {
      apiKey: env.DEEPSEEK_API_KEY || '',
      model: env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
      thinking: bool(env.DEEPSEEK_THINKING, true),
      effort: ['low', 'high', 'max'].includes(env.DEEPSEEK_EFFORT) ? env.DEEPSEEK_EFFORT : 'high',
      maxTokens: int(env.DEEPSEEK_MAX_TOKENS, 16000),
      apiBase: (env.DEEPSEEK_API_BASE || 'https://api.deepseek.com').replace(/\/+$/, ''),
    },

    plan: {
      priceRub: int(env.PRO_PRICE_RUB, 499),
      periodDays: int(env.PRO_PERIOD_DAYS, 30),
      proDailyLimit: int(env.PRO_DAILY_MESSAGES, 40),
      trialMessages: int(env.TRIAL_MESSAGES, 6),
      // Бесплатных разборов из одной сети (IP) в неделю — школьные сети делят один IP
      trialIpWeekly: int(env.TRIAL_PER_IP_WEEKLY, 15),
      // ИИ-сообщений во всех бесплатных разборах за сутки (бюджет API)
      trialAiDaily: int(env.TRIAL_AI_DAILY_LIMIT, 300),
    },

    payments: {
      yookassa,
      // Демо-оплата без денег: по умолчанию только вне production.
      demo: bool(env.PAYMENTS_DEMO, !production && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(publicUrl)),
    },

    media: {
      enabled: bool(env.MEDIA_FETCH, true),
      userAgent: env.MEDIA_USER_AGENT || 'PartaTutor/1.0 (educational site; contact: admin@example.com)',
    },
  };
}
