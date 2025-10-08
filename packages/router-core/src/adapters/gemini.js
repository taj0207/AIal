import { EchoAdapter } from './echo.js';

const normaliseModelName = (model) => {
  const slash = model.indexOf('/');
  return slash === -1 ? model : model.slice(slash + 1);
};

export class GeminiAdapter extends EchoAdapter {
  constructor(opts = {}) {
    super('gemini');
    this.opts = opts;
  }

  async chatSync(req) {
    if (!this.opts.apiKey) {
      throw new Error('GeminiAdapter requires an apiKey');
    }

    const base = (this.opts.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
    const providerModel = normaliseModelName(req.model);
    const url = `${base}/models/${providerModel}:generateContent?key=${encodeURIComponent(this.opts.apiKey)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: req.input.map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }]
        }))
      })
    });

    if (!response.ok) {
      const reason = await response.text();
      throw new Error(`GeminiAdapter request failed (${response.status}): ${reason}`);
    }

    const payload = await response.json();

    const outputText = (payload.candidates ?? [])
      .flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part?.text ?? '')
      .filter(Boolean)
      .join('\n');

    const output = [
      {
        role: 'assistant',
        content: outputText
      }
    ];

    return {
      id: `${this.name}-${Date.now()}`,
      model: providerModel,
      provider: this.name,
      output
    };
  }
}
