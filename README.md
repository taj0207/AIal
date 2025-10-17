# AIal - AI Abstract Layer (Open Source, BYOK)

> An open source multi-provider LLM gateway with OpenAI-compatible and custom APIs that you can run locally or on Cloud Run.
> The project is free to use, never stores your keys, and embraces the Bring Your Own Key (BYOK) model.

## Features
- OpenAI-compatible endpoints: `/v1/chat/completions`, `/v1/responses`
- Custom endpoints: `/v1/chat.sync`, `/v1/chat.stream`, `/v1/raw` (passthrough)
- Multi-provider adapters: OpenAI, Anthropic, xAI, Google
- Model routing presets: Gemini 2.5, GPT-5, o3 and o4, Grok 4, Grok code fast 1, Claude 4 Plus (development echo responses by default)
- Provider key detection: OpenAI, Google Gemini, xAI Grok, Anthropic Claude (falls back to echo when credentials are missing)
- Cloud Run or Docker friendly deployment
- BYOK environment variable or secret injection so credentials never persist on disk

## Quick start (Docker)
```bash
docker build -t aial:dev .
docker run --rm \
  -p 4000:4000 \
  -p 50051:50051 \
  -e AIAL_MASTER_KEY=sk-local-123 \
  -e OPENAI_API_KEY=your-openai-key \
  aial:dev
```

> Map port `50051` when you want to reach the Router over gRPC.

### Provider configuration
- OpenAI: `OPENAI_API_KEY` (optional `OPENAI_BASE_URL`, `OPENAI_ORG`, `OPENAI_PROJECT`)
- Google Gemini: `GEMINI_API_KEY` or `GOOGLE_API_KEY` (optional `GEMINI_API_BASE_URL`)
- xAI Grok: `XAI_API_KEY` or `GROK_API_KEY` (optional `XAI_API_BASE_URL`)
- Anthropic Claude: `ANTHROPIC_API_KEY` (optional `ANTHROPIC_API_BASE_URL`, `ANTHROPIC_API_VERSION`, `ANTHROPIC_MAX_TOKENS`)

> When none of the above environment variables are supplied the system still starts and responds with echo messages so you can test the API locally.

## API
- OpenAPI specification: `openapi/openapi.yaml` - the canonical AIal HTTP contract covering synchronous and streaming chat, OpenAI-compatible completions and responses, and the raw passthrough endpoint.
- gRPC (optional): `proto/chat.proto` exposes the `aial.v1.Router` surface.

### Using the REST API
AIal mirrors the OpenAI authentication pattern: every request must include your master key in the `Authorization` header using the `Bearer` scheme.

```bash
curl -X POST http://localhost:4000/v1/chat.sync \
  -H "Authorization: Bearer sk-local-123" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5-turbo",
    "messages": [
      { "role": "user", "content": "Say hello from AIal" }
    ]
  }'
```

All REST endpoints share the same authentication requirement:
- `/v1/chat.sync` returns a single message payload.
- `/v1/chat.stream` produces an SSE stream that you can read with any EventSource capable client.
- `/v1/chat/completions` and `/v1/responses` accept OpenAI-compatible payloads for drop-in SDK usage.
- `/v1/raw` forwards JSON directly to the selected provider for advanced control.

### Using the gRPC API
The gRPC transport is optional but enabled by default on `0.0.0.0:50051`. Install `@grpc/grpc-js` and `@grpc/proto-loader` in the daemon workspace to activate it, disable it by setting `AIAL_ENABLE_GRPC=false`, or rebind with `GRPC_HOST` and `GRPC_PORT`.

Generate a client from `proto/chat.proto`, or use `grpcurl` for quick tests:

```bash
grpcurl -plaintext -d '{
  "model": "gpt-5-turbo",
  "messages": [{"role": "USER", "content": "Say hello from AIal"}]
}' localhost:50051 aial.v1.Router/ChatSync
```

The gRPC server exposes two methods:
- `ChatSync` mirrors the REST `/v1/chat.sync` response payload.
- `ChatStream` yields a stream of partial messages comparable to `/v1/chat.stream`.

### JavaScript quick start
Install dependencies with `npm install`, run the local daemon (for example with Docker), and execute the sample script in `examples/chat-sync.mjs`. The script uses Node.js' built-in `fetch`, so Node 18+ is recommended.

```bash
# ensure the daemon is running locally on http://localhost:4000
export AIAL_MASTER_KEY=sk-local-123
node examples/chat-sync.mjs
```

You can override the host with `AIAL_URL` and supply a different master key via `AIAL_MASTER_KEY`.

If you prefer to integrate the router directly as a library inside your own application, `examples/library-usage.mjs` demonstrates how to instantiate the `Router`, register adapters, and execute `chatSync` without running the daemon. Run `npm install` first so Node.js can resolve the workspace packages.

System design reference: `docs/system-design.md`
