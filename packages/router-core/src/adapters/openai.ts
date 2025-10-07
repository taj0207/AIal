import type { ChatRequest, ChatResponse, ProviderAdapter } from '../index.js';

export class OpenAIAdapter implements ProviderAdapter {
  name = 'openai';
  constructor(private opts: { apiKey: string, baseUrl?: string } ){
    if (!opts.apiKey) throw new Error('Missing OPENAI_API_KEY');
  }
  async chatSync(req: ChatRequest): Promise<ChatResponse> {
    // TODO: 實作真正呼叫 OpenAI；目前先回 echo
    return {
      id: 'echo',
      model: req.model,
      provider: this.name,
      output: [{ role:'assistant', content: `echo: ${req.input.at(-1)?.content ?? ''}` }]
    };
  }
}
