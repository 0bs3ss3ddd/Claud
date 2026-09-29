// HTTP-клиент: JSON-запросы с CSRF-заголовком и чтение потока наставника (SSE поверх fetch).
export class ApiError extends Error {
  constructor(status, data) {
    super(data?.error || `Ошибка ${status}`);
    this.status = status;
    this.data = data || {};
  }
}

const HEADERS = { 'X-Parta': '1', Accept: 'application/json' };

export async function api(path, { method = 'GET', body, signal } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { ...HEADERS, 'Content-Type': 'application/json' } : HEADERS,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new ApiError(0, { error: 'Нет связи с сервером. Проверь интернет.' });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

/**
 * Запрос к наставнику. Если сервер ответил JSON-ошибкой (401/402/429) — бросает ApiError
 * до начала потока. Иначе вызывает колбэки на события потока.
 */
export async function tutorStream(body, { onMeta, onDelta, onDone, onError, signal } = {}) {
  let res;
  try {
    res = await fetch('/api/tutor', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { ...HEADERS, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') return;
    throw new ApiError(0, { error: 'Нет связи с сервером. Проверь интернет.' });
  }
  const type = res.headers.get('content-type') || '';
  if (!res.ok || !type.includes('text/event-stream')) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finished = false;
  const dispatch = (raw) => {
    let event = 'message';
    const dataLines = [];
    for (const line of raw.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
    }
    if (!dataLines.length) return;
    let data;
    try { data = JSON.parse(dataLines.join('\n')); } catch { return; }
    if (event === 'meta') onMeta?.(data);
    else if (event === 'delta') onDelta?.(data.t ?? '');
    else if (event === 'done') { finished = true; onDone?.(data); }
    else if (event === 'error' || event === 'refusal') { finished = true; onError?.(data.error || 'Ошибка', event); }
  };
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf('\n\n')) >= 0) {
        const chunk = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        if (chunk.startsWith(':')) continue; // ping
        dispatch(chunk);
      }
    }
  } catch (e) {
    if (e.name === 'AbortError') return;
    if (!finished) onError?.('Соединение прервалось. Попробуй ещё раз.', 'error');
    return;
  }
  if (!finished) onError?.('Ответ оборвался. Попробуй ещё раз.', 'error');
}
