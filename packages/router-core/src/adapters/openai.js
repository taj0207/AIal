import { EchoAdapter } from './echo.js';

const normaliseModelName = (model) => {
  const slash = model.indexOf('/');
  return slash === -1 ? model : model.slice(slash + 1);
};

const normaliseChoiceContent = (content) => {
  if (!content) return '';
  if (typeof content === 'string') return content;
  return content
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .filter(Boolean)
    .join('\n');
};

export class OpenAIAdapter extends EchoAdapter {
  constructor(opts = {}) {
    super('openai');
    this.opts = opts;
  }

  async chatSync(req) {
    if (!this.opts.apiKey) {
      throw new Error('OpenAIAdapter requires an apiKey');
    }

    const base = (this.opts.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    const providerModel = normaliseModelName(req.model);

    const response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.opts.apiKey}`,
        ...(this.opts.organization ? { 'OpenAI-Organization': this.opts.organization } : {}),
        ...(this.opts.project ? { 'OpenAI-Project': this.opts.project } : {})
      },
      body: JSON.stringify({
        model: providerModel,
        messages: req.input.map((message) => ({
          role: message.role,
          content: message.content
        })),
        stream: false
      })
    });

    if (!response.ok) {
      const reason = await response.text();
      throw new Error(`OpenAIAdapter request failed (${response.status}): ${reason}`);
    }

    const payload = await response.json();

    const output = (payload.choices ?? []).map((choice) => ({
      role: choice.message?.role ?? 'assistant',
      content: normaliseChoiceContent(choice.message?.content)
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
