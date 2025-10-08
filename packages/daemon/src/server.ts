import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import fastifySSE from 'fastify-sse-v2';
import {
  Router,
  prefixMatcher,
  type ChatMessage,
  type ChatRequest,
  type ChatResponse,
  type ProviderAdapter
} from '@aial/router-core';
import { OpenAIAdapter } from '@aial/router-core/src/adapters/openai.js';
import { GeminiAdapter } from '@aial/router-core/src/adapters/gemini.js';
import { GrokAdapter } from '@aial/router-core/src/adapters/grok.js';
import { AnthropicAdapter } from '@aial/router-core/src/adapters/anthropic.js';
import { EchoAdapter } from '@aial/router-core/src/adapters/echo.js';
import { startGrpcServer } from './grpc.js';

const PORT = Number(process.env.PORT || 4000);

const router = new Router();

const registerWithFallback = (
  provider: string,
  adapter: ProviderAdapter,
  matchers: Parameters<Router['registerAdapter']>[2]
) => {
  router.registerAdapter(provider, adapter, matchers);
};

const openAIAdapter = process.env.OPENAI_API_KEY
  ? new OpenAIAdapter({
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: process.env.OPENAI_BASE_URL,
      organization: process.env.OPENAI_ORG,
      project: process.env.OPENAI_PROJECT
    })
  : new EchoAdapter('openai');

registerWithFallback('openai', openAIAdapter, [
  prefixMatcher('gpt-5'),
  prefixMatcher('o3'),
  prefixMatcher('o4')
]);

const geminiApiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
const geminiAdapter = geminiApiKey
  ? new GeminiAdapter({
      apiKey: geminiApiKey,
      baseUrl: process.env.GEMINI_API_BASE_URL
    })
  : new EchoAdapter('gemini');
registerWithFallback('gemini', geminiAdapter, [prefixMatcher('gemini-2.5')]);

const grokApiKey = process.env.XAI_API_KEY ?? process.env.GROK_API_KEY;
const grokAdapter = grokApiKey
  ? new GrokAdapter({
      apiKey: grokApiKey,
      baseUrl: process.env.XAI_API_BASE_URL
    })
  : new EchoAdapter('grok');
registerWithFallback('grok', grokAdapter, [
  prefixMatcher('grok-4'),
  prefixMatcher('grok-code-fast-1')
]);

const anthropicAdapter = process.env.ANTHROPIC_API_KEY
  ? new AnthropicAdapter({
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseUrl: process.env.ANTHROPIC_API_BASE_URL,
      version: process.env.ANTHROPIC_API_VERSION,
      maxTokens: (() => {
        const raw = process.env.ANTHROPIC_MAX_TOKENS;
        if (!raw) return undefined;
        const numeric = Number(raw);
        return Number.isFinite(numeric) ? numeric : undefined;
      })()
    })
  : new EchoAdapter('anthropic');
registerWithFallback('anthropic', anthropicAdapter, [prefixMatcher('claude-4')]);

const app = Fastify({ logger: true });
app.register(fastifySSE);

const grpcHost = process.env.GRPC_HOST ?? '0.0.0.0';
const grpcPort = Number(process.env.GRPC_PORT ?? 50051);
const grpcEnabled = process.env.AIAL_ENABLE_GRPC !== 'false';

if (grpcEnabled) {
  const logger = {
    info: (msg: string) => app.log.info(msg),
    error: (msg: string, err?: unknown) => app.log.error({ err }, msg)
  };
  startGrpcServer(router, { host: grpcHost, port: grpcPort, logger }).catch((err) => {
    app.log.error({ err }, 'Failed to start gRPC server');
  });
} else {
  app.log.info('gRPC server disabled via AIAL_ENABLE_GRPC');
}

// Health
app.get('/healthz', async () => ({ ok: true }));

type AialMessageContent =
  | string
  | Array<{ type?: string; text?: string; value?: string; [key: string]: unknown }>;

interface AialChatMessage {
  role: ChatMessage['role'];
  content: AialMessageContent;
  [key: string]: unknown;
}

interface AialChatCompletionRequest {
  model: string;
  messages: AialChatMessage[];
  stream?: boolean;
  [key: string]: unknown;
}

interface AialResponsesRequest {
  model: string;
  input: AialMessageContent | AialChatMessage[];
  [key: string]: unknown;
}

interface RawPassthroughRequest {
  provider: string;
  target_model?: string;
  raw_path: string;
  raw_method: string;
  raw_headers?: Record<string, string>;
  raw_payload?: unknown;
}

const toChatMessages = (messages: AialMessageContent | AialChatMessage[]): ChatMessage[] => {
  if (Array.isArray(messages)) {
    return (messages as AialChatMessage[]).map((msg) => ({
      role: msg.role,
      content: normaliseMessageContent(msg.content)
    }));
  }

  return [
    {
      role: 'user',
      content: normaliseMessageContent(messages)
    }
  ];
};

const normaliseMessageContent = (content: AialMessageContent): string => {
  if (typeof content === 'string') return content;
  return content
    .map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part === 'object') {
        if (typeof part.text === 'string') return part.text;
        if (typeof part.value === 'string') return part.value;
      }
      return '';
    })
    .filter(Boolean)
    .join('\n');
};

const toAialChatCompletion = (res: ChatResponse) => ({
  id: res.id,
  object: 'chat.completion',
  created: Math.floor(Date.now() / 1000),
  model: res.model,
  provider: res.provider,
  choices: res.output.map((message: ChatMessage, index: number) => ({
    index,
    message,
    finish_reason: 'stop'
  })),
  usage: {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0
  }
});

const toAialResponse = (res: ChatResponse) => ({
  id: res.id,
  object: 'response',
  created: Math.floor(Date.now() / 1000),
  model: res.model,
  provider: res.provider,
  output: res.output.map((message: ChatMessage) => ({
    id: `${res.id}-${message.role}`,
    type: 'output_text',
    role: message.role,
    content: [{ type: 'output_text', text: message.content }]
  })),
  usage: {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0
  }
});

// Chat (non-stream)
app.post('/v1/chat.sync', async (
  req: FastifyRequest<{ Body: ChatRequest }>,
  reply: FastifyReply
) => {
  const body = req.body as ChatRequest;
  const res = await router.chatSync(body);
  return reply.send(res);
});

// Chat (SSE)
app.post('/v1/chat.stream', async (
  req: FastifyRequest<{ Body: ChatRequest }>,
  reply: FastifyReply
) => {
  const body = req.body as ChatRequest;
  const res = await router.chatSync(body);

  reply
    .header('Content-Type', 'text/event-stream')
    .header('Cache-Control', 'no-cache')
    .header('Connection', 'keep-alive');

  const payload = JSON.stringify(res);
  reply.raw.write(`event: message\n`);
  reply.raw.write(`data: ${payload}\n\n`);
  reply.raw.write('event: done\n');
  reply.raw.write('data: [DONE]\n\n');
  reply.raw.end();
  return reply;
});

// OpenAI compatible chat completions
app.post('/v1/chat/completions', async (
  req: FastifyRequest<{ Body: AialChatCompletionRequest }>,
  reply: FastifyReply
) => {
  const body = req.body as AialChatCompletionRequest;
  const chatReq: ChatRequest = {
    model: body.model,
    input: toChatMessages(body.messages),
    stream: Boolean(body.stream)
  };
  const res = await router.chatSync(chatReq);
  return reply.send(toAialChatCompletion(res));
});

// OpenAI responses API (non-stream, echo stub)
app.post('/v1/responses', async (
  req: FastifyRequest<{ Body: AialResponsesRequest }>,
  reply: FastifyReply
) => {
  const body = req.body as AialResponsesRequest;
  const messages: AialChatMessage[] = Array.isArray(body.input)
    ? (body.input as AialChatMessage[])
    : ([{ role: 'user', content: body.input }] as AialChatMessage[]);
  const chatReq: ChatRequest = {
    model: body.model,
    input: toChatMessages(messages)
  };
  const res = await router.chatSync(chatReq);
  return reply.send(toAialResponse(res));
});

// Raw passthrough (stub - echo)
app.post('/v1/raw', async (
  req: FastifyRequest<{ Body: RawPassthroughRequest }>,
  reply: FastifyReply
) => {
  const body = req.body as RawPassthroughRequest;
  return reply
    .headers({
      'X-Trace-Id': 'dev-trace',
      'X-Provider': body.provider || 'unknown'
    })
    .send({
      provider: body.provider,
      target_model: body.target_model,
      passthrough: {
        path: body.raw_path,
        method: body.raw_method,
        headers: body.raw_headers ?? {},
        payload: body.raw_payload ?? null
      }
    });
});

app.listen({ port: PORT, host: '0.0.0.0' }).then(() => {
  app.log.info(`AIal listening on :${PORT}`);
});
