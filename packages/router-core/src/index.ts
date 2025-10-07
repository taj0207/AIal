export type Role = 'system'|'user'|'assistant'|'tool';
export interface ChatMessage { role: Role; content: string; }
export interface ChatRequest {
  model: string;
  input: ChatMessage[];
  stream?: boolean;
}
export interface ChatResponse {
  id: string;
  model: string;
  provider: string;
  output: ChatMessage[];
}

export interface ProviderAdapter {
  name: string;
  chatSync(req: ChatRequest, signal?: AbortSignal): Promise<ChatResponse>;
}

export class Router {
  private adapters = new Map<string, ProviderAdapter>();
  registerAdapter(name: string, adapter: ProviderAdapter) {
    this.adapters.set(name, adapter);
  }
  async chatSync(req: ChatRequest): Promise<ChatResponse> {
    const [provider] = req.model.split('/', 1);
    const adapter = this.adapters.get(provider);
    if (!adapter) throw new Error(`No adapter for provider: ${provider}`);
    return adapter.chatSync(req);
  }
}
