// Реестр ИИ-провайдеров наставника. Порядок задаёт TUTOR_PROVIDERS: первый — основной,
// следующие — резерв, если основной не ответил (до начала ответа).
import { createAnthropicProvider } from './anthropic.js';
import { createYandexProvider } from './yandex.js';
import { createGigaChatProvider, trustExtraCa } from './gigachat.js';
import { createDeepSeekProvider } from './deepseek.js';

// Для политики конфиденциальности: кому и в какую страну уходят тексты вопросов.
export const PROVIDER_INFO = {
  anthropic: { title: 'Claude', operator: 'Anthropic PBC', country: 'США' },
  yandexgpt: { title: 'YandexGPT', operator: 'ООО «Яндекс.Облако»', country: 'Россия' },
  gigachat: { title: 'GigaChat', operator: 'ПАО Сбербанк', country: 'Россия' },
  deepseek: { title: 'DeepSeek', operator: 'Hangzhou DeepSeek Artificial Intelligence Co., Ltd.', country: 'Китай' },
};
export const DEFAULT_ORDER = ['anthropic', 'yandexgpt', 'gigachat', 'deepseek'];

/** Какие провайдеры настроены (есть ключи). */
export function configuredProviders(config) {
  const ok = {
    anthropic: Boolean(config.anthropic?.apiKey),
    yandexgpt: Boolean((config.yandex?.apiKey || config.yandex?.iamToken) && config.yandex?.folderId),
    gigachat: Boolean(config.gigachat?.authKey),
    deepseek: Boolean(config.deepseek?.apiKey),
  };
  const order = config.tutorProviders?.length ? config.tutorProviders : DEFAULT_ORDER;
  return order.filter((id) => ok[id]);
}

export function createProviders(config, { fetchImpl = fetch, log = console } = {}) {
  const ids = configuredProviders(config);
  for (const id of config.tutorProviders ?? []) {
    if (!ids.includes(id)) log.warn(`[tutor] провайдер «${id}» указан в TUTOR_PROVIDERS, но не настроен — пропускаю`);
  }
  return ids.map((id) => {
    switch (id) {
      case 'anthropic': return createAnthropicProvider(config.anthropic);
      case 'yandexgpt': return createYandexProvider(config.yandex, { fetchImpl });
      case 'gigachat':
        if (config.gigachat.caCert) trustExtraCa(config.gigachat.caCert, log);
        return createGigaChatProvider(config.gigachat, { fetchImpl });
      case 'deepseek': return createDeepSeekProvider(config.deepseek, { fetchImpl });
      default: return null;
    }
  }).filter(Boolean);
}
