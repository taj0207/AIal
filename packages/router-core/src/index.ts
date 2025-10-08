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

export type ModelMatcher = (model: string) => boolean;

export const prefixMatcher = (prefix: string): ModelMatcher => {
  return (model: string) => model.startsWith(prefix);
};

export class Router {
  private adapters = new Map<string, ProviderAdapter>();
  private modelResolvers: Array<{ provider: string; matcher: ModelMatcher }> = [];

  registerAdapter(name: string, adapter: ProviderAdapter, matchers: ModelMatcher[] = []) {
    this.adapters.set(name, adapter);
    for (const matcher of matchers) {
      this.modelResolvers.push({ provider: name, matcher });
    }
  }

  registerModelMatcher(provider: string, matcher: ModelMatcher) {
    if (!this.adapters.has(provider)) {
      throw new Error(`Cannot register matcher for unknown provider: ${provider}`);
    }
    this.modelResolvers.push({ provider, matcher });
  }

  private resolveProvider(model: string): string {
    const slashIndex = model.indexOf('/');
    if (slashIndex !== -1) {
      return model.slice(0, slashIndex);
    }
    for (const { provider, matcher } of this.modelResolvers) {
      if (matcher(model)) {
        return provider;
      }
    }
    throw new Error(`No adapter for model: ${model}`);
  }

  async chatSync(req: ChatRequest): Promise<ChatResponse> {
    const provider = this.resolveProvider(req.model);
    const adapter = this.adapters.get(provider);
    if (!adapter) throw new Error(`No adapter for provider: ${provider}`);
    return adapter.chatSync(req);
  }
}
