export const prefixMatcher = (prefix) => {
  return (model) => model.startsWith(prefix);
};

export class Router {
  constructor() {
    this.adapters = new Map();
    this.modelResolvers = [];
  }

  registerAdapter(name, adapter, matchers = []) {
    this.adapters.set(name, adapter);
    for (const matcher of matchers) {
      this.modelResolvers.push({ provider: name, matcher });
    }
  }

  registerModelMatcher(provider, matcher) {
    if (!this.adapters.has(provider)) {
      throw new Error(`Cannot register matcher for unknown provider: ${provider}`);
    }
    this.modelResolvers.push({ provider, matcher });
  }

  resolveProvider(model) {
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

  async chatSync(req) {
    const provider = this.resolveProvider(req.model);
    const adapter = this.adapters.get(provider);
    if (!adapter) throw new Error(`No adapter for provider: ${provider}`);
    return adapter.chatSync(req);
  }
}
