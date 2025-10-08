import type { ChatRequest, ChatResponse, ProviderAdapter } from '../index.js';

export class EchoAdapter implements ProviderAdapter {
  constructor(public readonly name: string) {}

  async chatSync(req: ChatRequest): Promise<ChatResponse> {
    return {
      id: `${this.name}-echo`,
      model: req.model,
      provider: this.name,
      output: [
        {
          role: 'assistant',
          content: `[${this.name}] echo: ${req.input[req.input.length - 1]?.content ?? ''}`
        }
      ]
    };
  }
}
