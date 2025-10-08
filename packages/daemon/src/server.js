import { createServer } from 'node:http';
import { Router, prefixMatcher } from '@aial/router-core';
import { OpenAIAdapter } from '@aial/router-core/src/adapters/openai.js';
import { GeminiAdapter } from '@aial/router-core/src/adapters/gemini.js';
import { GrokAdapter } from '@aial/router-core/src/adapters/grok.js';
import { AnthropicAdapter } from '@aial/router-core/src/adapters/anthropic.js';
import { EchoAdapter } from '@aial/router-core/src/adapters/echo.js';
import { startGrpcServer } from './grpc.js';

const PORT = Number(process.env.PORT || 4000);

const router = new Router();

const registerWithFallback = (provider, adapter, matchers) => {
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

const logger = {
  info: (msg) => console.log(`[info] ${msg}`),
  warn: (msg) => console.warn(`[warn] ${msg}`),
  error: (msg, err) => {
    if (err) {
      console.error(`[error] ${msg}`, err);
    } else {
      console.error(`[error] ${msg}`);
    }
  }
};

const sendJson = (res, statusCode, payload) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

const sendError = (res, statusCode, message) => {
  sendJson(res, statusCode, { error: message });
};

const normaliseMessageContent = (content) => {
  if (typeof content === 'string') return content;
  return (content ?? [])
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

const toChatMessages = (messages) => {
  if (Array.isArray(messages)) {
    return messages.map((msg) => ({
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

const toAialChatCompletion = (res) => ({
  id: res.id,
  object: 'chat.completion',
  created: Math.floor(Date.now() / 1000),
  model: res.model,
  provider: res.provider,
  choices: res.output.map((message, index) => ({
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

const toAialResponse = (res) => ({
  id: res.id,
  object: 'response',
  created: Math.floor(Date.now() / 1000),
  model: res.model,
  provider: res.provider,
  output: res.output.map((message) => ({
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

const readJson = (req) =>
  new Promise((resolve, reject) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        const err = new Error('Invalid JSON body');
        err.statusCode = 400;
        reject(err);
      }
    });
    req.on('error', (err) => reject(err));
  });

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/healthz') {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method !== 'POST') {
      sendError(res, 404, 'Not Found');
      return;
    }

    const body = await readJson(req);

    if (url.pathname === '/v1/chat.sync') {
      const chatReq = body;
      const result = await router.chatSync(chatReq);
      sendJson(res, 200, result);
      return;
    }

    if (url.pathname === '/v1/chat.stream') {
      const chatReq = body;
      const result = await router.chatSync(chatReq);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write(`event: message\n`);
      res.write(`data: ${JSON.stringify(result)}\n\n`);
      res.write('event: done\n');
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    if (url.pathname === '/v1/chat/completions') {
      const chatReq = {
        model: body.model,
        input: toChatMessages(body.messages),
        stream: Boolean(body.stream)
      };
      const result = await router.chatSync(chatReq);
      sendJson(res, 200, toAialChatCompletion(result));
      return;
    }

    if (url.pathname === '/v1/responses') {
      const messages = Array.isArray(body.input)
        ? body.input
        : [{ role: 'user', content: body.input }];
      const chatReq = {
        model: body.model,
        input: toChatMessages(messages)
      };
      const result = await router.chatSync(chatReq);
      sendJson(res, 200, toAialResponse(result));
      return;
    }

    if (url.pathname === '/v1/raw') {
      res.setHeader('X-Trace-Id', 'dev-trace');
      res.setHeader('X-Provider', body.provider || 'unknown');
      sendJson(
        res,
        200,
        {
          provider: body.provider,
          target_model: body.target_model,
          passthrough: {
            path: body.raw_path,
            method: body.raw_method,
            headers: body.raw_headers ?? {},
            payload: body.raw_payload ?? null
          }
        }
      );
      return;
    }

    sendError(res, 404, 'Not Found');
  } catch (error) {
    const statusCode = error?.statusCode ?? 500;
    logger.error('request failed', error);
    sendError(res, statusCode, error?.message ?? 'Internal Server Error');
  }
});

const grpcHost = process.env.GRPC_HOST ?? '0.0.0.0';
const grpcPort = Number(process.env.GRPC_PORT ?? 50051);
const grpcEnabled = process.env.AIAL_ENABLE_GRPC !== 'false';

if (grpcEnabled) {
  startGrpcServer(router, { host: grpcHost, port: grpcPort, logger })
    .then((grpcServer) => {
      if (!grpcServer) {
        logger.warn('gRPC server not started. Install @grpc/grpc-js and @grpc/proto-loader to enable it.');
      }
    })
    .catch((err) => {
      logger.error('Failed to start gRPC server', err);
    });
} else {
  logger.info('gRPC server disabled via AIAL_ENABLE_GRPC');
}

server.listen(PORT, '0.0.0.0', () => {
  logger.info(`AIal listening on :${PORT}`);
});
