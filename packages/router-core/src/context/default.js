import { EchoAdapter } from '../adapters/echo.js';
import { OpenAIAdapter } from '../adapters/openai.js';
import { GeminiAdapter } from '../adapters/gemini.js';
import { GrokAdapter } from '../adapters/grok.js';
import { AnthropicAdapter } from '../adapters/anthropic.js';

const prefixMatcher = (prefix) => (model) => model.startsWith(prefix);

const parseInteger = (value) => {
  if (!value) return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

const normaliseEnv = (env = process.env) => ({
  ...env,
  GEMINI_API_KEY: env.GEMINI_API_KEY ?? env.GOOGLE_API_KEY,
  GROK_API_KEY: env.GROK_API_KEY ?? env.XAI_API_KEY,
  XAI_API_KEY: env.XAI_API_KEY ?? env.GROK_API_KEY
});

export const configureDefaultContext = (router, options = {}) => {
  const env = normaliseEnv(options.env);
  const configured = [];

  const register = (provider, adapter, { matchers = [], defaultModel } = {}) => {
    router.registerAdapter(provider, adapter, matchers);
    configured.push({ provider, defaultModel });
  };

  if (env.OPENAI_API_KEY) {
    register(
      'openai',
      new OpenAIAdapter({
        apiKey: env.OPENAI_API_KEY,
        baseUrl: env.OPENAI_BASE_URL,
        organization: env.OPENAI_ORG,
        project: env.OPENAI_PROJECT
      }),
      {
        matchers: [prefixMatcher('gpt-5'), prefixMatcher('o3'), prefixMatcher('o4')],
        defaultModel: 'openai/gpt-4o-mini'
      }
    );
  }

  if (env.GEMINI_API_KEY) {
    register(
      'gemini',
      new GeminiAdapter({
        apiKey: env.GEMINI_API_KEY,
        baseUrl: env.GEMINI_API_BASE_URL
      }),
      {
        matchers: [prefixMatcher('gemini-2.5'), prefixMatcher('gemini-1.5')],
        defaultModel: 'gemini/gemini-2.5-flash'
      }
    );
  }

  if (env.XAI_API_KEY) {
    register(
      'grok',
      new GrokAdapter({
        apiKey: env.XAI_API_KEY,
        baseUrl: env.XAI_API_BASE_URL
      }),
      {
        matchers: [prefixMatcher('grok-4'), prefixMatcher('grok-code-fast-1')],
        defaultModel: 'grok/grok-4'
      }
    );
  }

  if (env.ANTHROPIC_API_KEY) {
    register(
      'anthropic',
      new AnthropicAdapter({
        apiKey: env.ANTHROPIC_API_KEY,
        baseUrl: env.ANTHROPIC_API_BASE_URL,
        version: env.ANTHROPIC_API_VERSION,
        maxTokens: parseInteger(env.ANTHROPIC_MAX_TOKENS)
      }),
      {
        matchers: [prefixMatcher('claude-4'), prefixMatcher('claude-3')],
        defaultModel: 'anthropic/claude-4.1'
      }
    );
  }

  if (!configured.length && !options.allowEchoFallback) {
    throw new Error(
      'No AI providers configured. Set OPENAI_API_KEY, GEMINI_API_KEY, GOOGLE_API_KEY, XAI_API_KEY, GROK_API_KEY, or ANTHROPIC_API_KEY.'
    );
  }

  if (!configured.length && options.allowEchoFallback) {
    register('local', new EchoAdapter('local'), { defaultModel: 'local/echo' });
  }

  const selectedModel =
    options.defaultModel ??
    env.AIAL_MODEL ??
    configured.find((entry) => entry.defaultModel)?.defaultModel;

  if (!selectedModel) {
    throw new Error(
      'Unable to determine the default model. Provide AIAL_MODEL or defaultModel when configuring the context.'
    );
  }

  // Ensure the selected model resolves to a registered provider.
  try {
    router.resolveProvider(selectedModel);
  } catch (error) {
    const providers = configured.map((entry) => entry.provider).join(', ') || 'none';
    throw new Error(
      `No adapter registered for model "${selectedModel}". Available providers: ${providers}.`
    );
  }

  return {
    defaultModel: selectedModel,
    providers: configured.map((entry) => entry.provider),
    availableModels: configured
      .map((entry) => entry.defaultModel)
      .filter((model) => typeof model === 'string'),
    resolveModel(model) {
      router.resolveProvider(model);
      return model;
    }
  };
};
