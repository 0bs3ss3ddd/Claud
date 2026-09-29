// Claude (Anthropic): потоковый ответ, адаптивное мышление, кэш промпта, серверный фолбэк при отказе.
import Anthropic from '@anthropic-ai/sdk';
import { ProviderError } from './common.js';

export function createAnthropicProvider(cfg) {
  const client = new Anthropic({ apiKey: cfg.apiKey, baseURL: cfg.baseURL, maxRetries: 2, timeout: 10 * 60 * 1000 });

  return {
    id: 'anthropic',
    title: 'Claude',
    maxContextChars: 400000,

    async stream({ system, context, turns, action, signal, onText }) {
      const messages = turns.map((m, i) => (i === 0
        ? {
            role: 'user',
            content: [
              { type: 'text', text: context, cache_control: { type: 'ephemeral' } },
              { type: 'text', text: m.content },
            ],
          }
        : { role: m.role, content: m.content }));
      const params = {
        model: cfg.model,
        max_tokens: cfg.maxTokens,
        thinking: { type: 'adaptive' },
        output_config: { effort: action === 'hint' ? 'medium' : cfg.effort },
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        messages,
      };
      if (cfg.fallbacks) {
        params.betas = ['server-side-fallback-2026-07-01'];
        params.fallbacks = 'default';
      }
      try {
        const stream = client.beta.messages.stream(params, { signal });
        stream.on('text', (delta) => onText(delta));
        const final = await stream.finalMessage();
        if (final.stop_reason === 'refusal') return { stop: 'refusal' };
        return { stop: final.stop_reason === 'max_tokens' ? 'max_tokens' : 'end' };
      } catch (err) {
        if (signal?.aborted || err instanceof Anthropic.APIUserAbortError) throw Object.assign(new Error('aborted'), { name: 'AbortError' });
        const status = err instanceof Anthropic.APIError ? Number(err.status) || 0 : 0;
        throw new ProviderError(`anthropic: ${err?.message ?? 'ошибка'}`, { status, provider: 'anthropic' });
      }
    },
  };
}
