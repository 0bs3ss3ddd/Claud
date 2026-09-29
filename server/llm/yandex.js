// YandexGPT (Yandex Cloud / AI Studio, Foundation Models API).
// Поток — строки JSON; в каждой строке текст ответа целиком на текущий момент (или порция —
// поддерживаем оба варианта).
import { ProviderError, readLines, ensureOk, request, withContext } from './common.js';

export function createYandexProvider(cfg, { fetchImpl }) {
  const modelUri = cfg.model.startsWith('gpt://') ? cfg.model : `gpt://${cfg.folderId}/${cfg.model}`;
  const auth = cfg.iamToken ? `Bearer ${cfg.iamToken}` : `Api-Key ${cfg.apiKey}`;

  return {
    id: 'yandexgpt',
    title: 'YandexGPT',
    // YandexGPT Pro: контекст 32 тыс. токенов — держим историю компактной
    maxContextChars: 60000,

    async stream({ system, context, turns, action, signal, onText }) {
      const messages = [
        { role: 'system', text: system },
        ...withContext(turns, context).map((t) => ({ role: t.role, text: t.content })),
      ];
      const res = await request(fetchImpl, `${cfg.apiBase}/foundationModels/v1/completion`, {
        method: 'POST',
        headers: {
          Authorization: auth,
          'x-folder-id': cfg.folderId,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          modelUri,
          completionOptions: {
            stream: true,
            temperature: cfg.temperature,
            maxTokens: String(action === 'hint' ? Math.min(cfg.maxTokens, 800) : cfg.maxTokens),
          },
          messages,
        }),
        signal,
      }, 'yandexgpt');
      await ensureOk(res, 'yandexgpt');

      let acc = '';
      let stop = 'end';
      for await (const line of readLines(res)) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let data;
        try { data = JSON.parse(trimmed); } catch { continue; }
        if (data.error) {
          throw new ProviderError(`yandexgpt: ${data.error.message ?? data.error.grpcCode ?? 'ошибка'}`, { status: Number(data.error.httpCode) || 500, provider: 'yandexgpt' });
        }
        const alt = data.result?.alternatives?.[0];
        if (!alt) continue;
        const text = alt.message?.text ?? '';
        let delta;
        if (text.startsWith(acc)) { delta = text.slice(acc.length); acc = text; } else { delta = text; acc += text; }
        if (delta) onText(delta);
        if (alt.status === 'ALTERNATIVE_STATUS_CONTENT_FILTER') stop = 'refusal';
        else if (alt.status === 'ALTERNATIVE_STATUS_TRUNCATED_FINAL') stop = 'max_tokens';
      }
      return { stop };
    },
  };
}
