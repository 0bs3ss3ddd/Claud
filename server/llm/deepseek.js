// DeepSeek: Chat Completions в формате OpenAI. Режим рассуждений (thinking) включается
// параметром; рассуждения приходят в reasoning_content и ученику не показываются.
import { ensureOk, request, consumeOpenAiStream, withContext } from './common.js';

export function createDeepSeekProvider(cfg, { fetchImpl }) {
  return {
    id: 'deepseek',
    title: 'DeepSeek',
    maxContextChars: 300000,

    async stream({ system, context, turns, action, signal, onText }) {
      const body = {
        model: cfg.model,
        messages: [{ role: 'system', content: system }, ...withContext(turns, context)],
        stream: true,
        max_tokens: cfg.maxTokens,
      };
      if (cfg.thinking) {
        body.thinking = { type: 'enabled' };
        body.reasoning_effort = action === 'hint' ? 'low' : cfg.effort;
      } else {
        body.thinking = { type: 'disabled' };
      }
      const res = await request(fetchImpl, `${cfg.apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfg.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(body),
        signal,
      }, 'deepseek');
      await ensureOk(res, 'deepseek');
      const { finish } = await consumeOpenAiStream(res, onText, 'deepseek');
      if (finish === 'content_filter') return { stop: 'refusal' };
      return { stop: finish === 'length' ? 'max_tokens' : 'end' };
    },
  };
}
