# AIal Release Notes

## First Edition (2025-10-08)

The inaugural release of AIal introduces a Bring Your Own Key (BYOK) abstraction layer for modern LLM providers.

### Highlights
- **Unified Router Core** - A provider agnostic router that normalizes chat requests and responses and routes traffic based on model prefixes.
- **Multi-Provider Adapters** - Built in adapters for OpenAI (GPT-5 and o3 and o4), Google Gemini (Gemini 2.5), Anthropic Claude 4 Plus, and xAI Grok (chat and code fast) with automatic echo fallbacks when credentials are absent.
- **HTTP Daemon and gRPC Router** - A production ready HTTP server exposing OpenAI compatible endpoints (`/v1/chat/completions`, `/v1/responses`) alongside custom APIs (`/v1/chat.sync`, `/v1/chat.stream`, `/v1/raw`), plus an optional gRPC surface (`aial.v1.Router`) powered by the same router core (install `@grpc/grpc-js` and `@grpc/proto-loader` to enable).
- **BYOK Deployment** - Docker and Cloud Run ready, keeping provider secrets outside the codebase and supporting local development via environment variables.
- **Developer Tooling** - OpenAPI spec, gRPC proto, and system design documentation to simplify integration and extension.

### Getting Started
Consult the [README](README.md) for setup instructions, environment variables, and deployment tips.
