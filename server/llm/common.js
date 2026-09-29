// Общее для ИИ-провайдеров наставника: ошибки, чтение потоков, обрезка истории.

export class ProviderError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, provider?: string }} [opts]
   */
  constructor(message, { status = 0, provider = '' } = {}) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
    this.provider = provider;
  }
  /** Перегрузка или сбой на стороне провайдера (а не ошибка в запросе). */
  get busy() {
    return this.status === 429 || this.status >= 500 || this.status === 0;
  }
}

/** Читает тело ответа построчно (для SSE и NDJSON). */
export async function* readLines(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).replace(/\r$/, '');
      buffer = buffer.slice(idx + 1);
      yield line;
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) yield buffer.replace(/\r$/, '');
}

/** Бросает ProviderError, если ответ HTTP не 2xx (текст ошибки — без секретов, обрезан). */
export async function ensureOk(response, provider) {
  if (response.ok) return;
  let detail = '';
  try { detail = (await response.text()).slice(0, 300); } catch { /* пусто */ }
  throw new ProviderError(`${provider}: HTTP ${response.status} ${detail}`.trim(), { status: response.status, provider });
}

/** Сетевые ошибки fetch → ProviderError (кроме отмены запроса). */
export async function request(fetchImpl, url, init, provider) {
  try {
    return await fetchImpl(url, init);
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ProviderError(`${provider}: сеть недоступна (${err?.cause?.code ?? err?.message ?? 'ошибка'})`, { provider });
  }
}

/**
 * Разбор потока в формате OpenAI Chat Completions (DeepSeek, GigaChat):
 * строки «data: {...}», конец — «data: [DONE]».
 * @returns {Promise<{ finish: string|null }>}
 */
export async function consumeOpenAiStream(response, onText, provider) {
  let finish = null;
  for await (const line of readLines(response)) {
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (payload === '[DONE]') break;
    let chunk;
    try { chunk = JSON.parse(payload); } catch { continue; }
    if (chunk.error) throw new ProviderError(`${provider}: ${chunk.error.message ?? 'ошибка в потоке'}`, { status: 500, provider });
    const choice = chunk.choices?.[0];
    if (!choice) continue;
    const text = choice.delta?.content; // reasoning_content (рассуждения) не показываем
    if (typeof text === 'string' && text) onText(text);
    if (choice.finish_reason) finish = choice.finish_reason;
  }
  return { finish };
}

/**
 * Обрезает историю под контекст модели: старые пары «вопрос — ответ» уходят первыми,
 * последняя реплика ученика остаётся всегда.
 */
export function trimTurns(turns, fixedChars, maxChars) {
  let out = turns;
  const size = (list) => list.reduce((n, t) => n + t.content.length, fixedChars);
  while (out.length > 1 && size(out) > maxChars) out = out.slice(2);
  return out;
}

/** Первая реплика ученика получает контекст задачи (для API без отдельных блоков). */
export function withContext(turns, context) {
  return turns.map((t, i) => (i === 0 ? { role: t.role, content: `${context}\n\n${t.content}` } : t));
}
