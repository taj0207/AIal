import { EchoAdapter } from './echo.js';

const normaliseModelName = (model) => {
  const slash = model.indexOf('/');
  return slash === -1 ? model : model.slice(slash + 1);
};

const mapMessages = (messages) => {
  const systemParts = [];
  const conversation = [];

  for (const message of messages) {
    if (message.role === 'system') {
      systemParts.push(message.content);
      continue;
    }
    conversation.push({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: [{ type: 'text', text: message.content }]
    });
  }

  return {
    system: systemParts.length ? systemParts.join('\n\n') : undefined,
    conversation
  };
};

export class AnthropicAdapter extends EchoAdapter {
  constructor(opts = {}) {
    super('anthropic');
    this.opts = opts;
  }

  async chatSync(req) {
    if (!this.opts.apiKey) {
      throw new Error('AnthropicAdapter requires an apiKey');
    }

    const base = (this.opts.baseUrl ?? 'https://api.anthropic.com/v1').replace(/\/$/, '');
    const providerModel = normaliseModelName(req.model);
    const { system, conversation } = mapMessages(req.input);

    const response = await fetch(`${base}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.opts.apiKey,
        'anthropic-version': this.opts.version ?? '2023-06-01'
      },
      body: JSON.stringify({
        model: providerModel,
        max_tokens: this.opts.maxTokens ?? 1024,
        messages: conversation,
        ...(system ? { system } : {})
      })
    });

    if (!response.ok) {
      const reason = await response.text();
      throw new Error(`AnthropicAdapter request failed (${response.status}): ${reason}`);
    }

    const payload = await response.json();
    const content = (payload.content ?? [])
      .map((part) => part.text ?? '')
      .filter(Boolean)
      .join('\n');

    return {
      id: payload.id ?? `${this.name}-${Date.now()}`,
      model: payload.model ?? providerModel,
      provider: this.name,
      output: [
        {
          role: 'assistant',
          content
        }
      ]
    };
  }
}
