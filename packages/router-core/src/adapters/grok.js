import { EchoAdapter } from './echo.js';

const normaliseModelName = (model) => {
  const slash = model.indexOf('/');
  return slash === -1 ? model : model.slice(slash + 1);
};

export class GrokAdapter extends EchoAdapter {
  constructor(opts = {}) {
    super('grok');
    this.opts = opts;
  }

  async chatSync(req) {
    if (!this.opts.apiKey) {
      throw new Error('GrokAdapter requires an apiKey');
    }

    const base = (this.opts.baseUrl ?? 'https://api.x.ai/v1').replace(/\/$/, '');
    const providerModel = normaliseModelName(req.model);

    const response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.opts.apiKey}`
      },
      body: JSON.stringify({
        model: providerModel,
        messages: req.input.map((message) => ({
          role: message.role,
          content: message.content
        }))
      })
    });

    if (!response.ok) {
      const reason = await response.text();
      throw new Error(`GrokAdapter request failed (${response.status}): ${reason}`);
    }

    const payload = await response.json();
    const output = (payload.choices ?? []).map((choice) => ({
      role: choice.message?.role ?? 'assistant',
      content: choice.message?.content ?? ''
    }));

    if (!output.length) {
      output.push({ role: 'assistant', content: '' });
    }

    return {
      id: payload.id ?? `${this.name}-${Date.now()}`,
      model: payload.model ?? providerModel,
      provider: this.name,
      output
    };
  }
}
