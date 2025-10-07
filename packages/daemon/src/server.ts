import Fastify from 'fastify';
import fastifySSE from 'fastify-sse-v2';
import { Router } from '@aial/router-core';
import { OpenAIAdapter } from '@aial/router-core/src/adapters/openai.js';

const PORT = Number(process.env.PORT || 4000);

const router = new Router();
if (process.env.OPENAI_API_KEY) {
  router.registerAdapter('openai', new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY }));
}

const app = Fastify({ logger: true });
app.register(fastifySSE);

// Health
app.get('/healthz', async () => ({ ok: true }));

// Chat (non-stream)
app.post('/v1/chat.sync', async (req, reply) => {
  const body: any = req.body;
  const res = await router.chatSync(body);
  return reply.send(res);
});

// Raw passthrough (stub - echo)
app.post('/v1/raw', async (req, reply) => {
  return reply.headers({
    'X-Trace-Id': 'dev-trace',
    'X-Provider': (req.headers['x-provider'] as string) || 'unknown'
  }).send({ raw: { echo: req.body } });
});

app.listen({ port: PORT, host: '0.0.0.0' }).then(() => {
  app.log.info(`AIal listening on :${PORT}`);
});
