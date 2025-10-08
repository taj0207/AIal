type Buffer = any;
type URL = any;

declare namespace NodeJS {
  interface ReadableStream {}
  interface WritableStream {}
}

interface AbortSignal {
  readonly aborted: boolean;
}

declare const process: {
  env: Record<string, string | undefined>;
};

declare module 'node:url' {
  export function fileURLToPath(path: string | URL): string;
}

declare module 'node:path' {
  export function dirname(path: string): string;
  export function join(...paths: string[]): string;
}

declare module '@aial/router-core' {
  export type Role = 'system' | 'user' | 'assistant' | 'tool';
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
  export const prefixMatcher: (prefix: string) => ModelMatcher;
  export class Router {
    registerAdapter(name: string, adapter: ProviderAdapter, matchers?: ModelMatcher[]): void;
    registerModelMatcher(provider: string, matcher: ModelMatcher): void;
    chatSync(req: ChatRequest): Promise<ChatResponse>;
  }
}

declare module '@aial/router-core/src/adapters/openai.js' {
  import type { ProviderAdapter } from '@aial/router-core';
  export class OpenAIAdapter implements ProviderAdapter {
    constructor(opts?: {
      apiKey?: string;
      baseUrl?: string;
      organization?: string;
      project?: string;
    });
    name: string;
    chatSync: ProviderAdapter['chatSync'];
  }
}

declare module '@aial/router-core/src/adapters/echo.js' {
  import type { ProviderAdapter } from '@aial/router-core';
  export class EchoAdapter implements ProviderAdapter {
    constructor(name: string);
    name: string;
    chatSync: ProviderAdapter['chatSync'];
  }
}

declare module '@aial/router-core/src/adapters/gemini.js' {
  import type { ProviderAdapter } from '@aial/router-core';
  export class GeminiAdapter implements ProviderAdapter {
    constructor(opts?: { apiKey?: string; baseUrl?: string });
    name: string;
    chatSync: ProviderAdapter['chatSync'];
  }
}

declare module '@aial/router-core/src/adapters/grok.js' {
  import type { ProviderAdapter } from '@aial/router-core';
  export class GrokAdapter implements ProviderAdapter {
    constructor(opts?: { apiKey?: string; baseUrl?: string });
    name: string;
    chatSync: ProviderAdapter['chatSync'];
  }
}

declare module '@grpc/proto-loader' {
  export interface ProtoLoaderOptions {
    keepCase?: boolean;
    longs?: unknown;
    enums?: unknown;
    defaults?: boolean;
    oneofs?: boolean;
  }
  export function loadSync(path: string, options?: ProtoLoaderOptions): unknown;
}

declare module '@grpc/grpc-js' {
  export interface ServerCredentials {}
  export const ServerCredentials: { createInsecure(): ServerCredentials };
  export class Server {
    addService(service: unknown, implementation: Record<string, unknown>): void;
    bindAsync(
      address: string,
      credentials: ServerCredentials,
      callback: (err: Error | null, port: number) => void
    ): void;
    start(): void;
  }
  export function loadPackageDefinition(definition: unknown): unknown;
}

declare module '@aial/router-core/src/adapters/anthropic.js' {
  import type { ProviderAdapter } from '@aial/router-core';
  export class AnthropicAdapter implements ProviderAdapter {
    constructor(opts?: {
      apiKey?: string;
      baseUrl?: string;
      maxTokens?: number;
      version?: string;
    });
    name: string;
    chatSync: ProviderAdapter['chatSync'];
  }
}

declare module 'fastify' {
  interface FastifyRequest<T = unknown> {
    body: T extends { Body: infer B } ? B : unknown;
    headers: Record<string, unknown>;
  }

  interface FastifyReply {
    raw: {
      write(data: string): void;
      end(): void;
    };
    header(name: string, value: string): FastifyReply;
    headers(headers: Record<string, string>): FastifyReply;
    send(payload: unknown): unknown;
  }

    interface FastifyInstance {
      get(path: string, handler: (...args: any[]) => any): void;
      post(path: string, handler: (...args: any[]) => any): void;
      register(plugin: any): void;
      listen(opts: { port: number; host: string }): Promise<void>;
      log: {
        info(msg: string): void;
        error(obj: unknown, msg?: string): void;
      };
    }

  interface FastifyServerOptions {
    logger?: boolean;
  }

  function Fastify(opts?: FastifyServerOptions): FastifyInstance;
  export default Fastify;
  export { FastifyInstance, FastifyReply, FastifyRequest };
}

declare module 'fastify-sse-v2' {
  const plugin: any;
  export default plugin;
}

declare module 'http' {
  const http: any;
  export = http;
  namespace http {
    interface IncomingMessage {}
    interface ServerResponse {}
    interface Server {}
    interface ServerOptions {}
    type RequestListener = (...args: any[]) => void;
    interface OutgoingHttpHeaders {
      [header: string]: any;
    }
  }
}

declare module 'http2' {
  const http2: any;
  export = http2;
  namespace http2 {
    interface Http2Server {}
    interface Http2SecureServer {}
    interface Http2ServerRequest {}
    interface Http2ServerResponse {}
    interface SecureServerOptions {}
  }
}

declare module 'https' {
  const https: any;
  export = https;
  namespace https {
    interface Server {}
    interface ServerOptions {}
  }
}

declare module 'net' {
  const net: any;
  export = net;
  namespace net {
    interface Socket {}
    interface AddressInfo {
      address: string;
      family: string;
      port: number;
    }
  }
}

declare module 'stream' {
  const stream: any;
  export = stream;
  namespace stream {
    interface Readable {}
  }
}

declare module 'events' {
  const events: any;
  export = events;
  namespace events {
    interface EventEmitter {}
  }
}

declare module 'worker_threads' {
  const workerThreads: any;
  export = workerThreads;
  namespace workerThreads {
    interface WorkerOptions {}
  }
}
