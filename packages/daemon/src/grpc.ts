import { Router, type ChatRequest, type ChatResponse } from '@aial/router-core';
import { loadSync } from '@grpc/proto-loader';
import { loadPackageDefinition, Server, ServerCredentials } from '@grpc/grpc-js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

interface StartGrpcServerOptions {
  host?: string;
  port?: number;
  logger?: { info?(msg: string): void; error?(msg: string, err?: unknown): void };
}

interface GrpcChatMessage {
  role: ChatRequest['input'][number]['role'];
  content: string;
}

interface GrpcChatRequest {
  model: string;
  input: GrpcChatMessage[];
  stream?: boolean;
}

interface GrpcChatChunk {
  type: string;
  delta: string;
}

interface GrpcChatResponse extends ChatResponse {}

export const startGrpcServer = async (
  router: Router,
  options: StartGrpcServerOptions = {}
) => {
  const host = options.host ?? '0.0.0.0';
  const port = options.port ?? 50051;
  const protoPath = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../../proto/chat.proto'
  );
  const packageDefinition = loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });
  const descriptor = loadPackageDefinition(packageDefinition) as any;
  const service = descriptor.aial?.v1?.Router?.service;
  if (!service) {
    throw new Error('Unable to load gRPC router service definition');
  }

  const server = new Server();
  server.addService(service, {
    ChatSync: async (
      call: { request: GrpcChatRequest },
      callback: (err: unknown, response?: GrpcChatResponse) => void
    ) => {
      try {
        const response = await router.chatSync({
          model: call.request.model,
          input: call.request.input,
          stream: Boolean(call.request.stream)
        });
        callback(null, response);
      } catch (error) {
        options.logger?.error?.('gRPC ChatSync failed', error);
        callback(error);
      }
    },
    ChatStream: async (
      call: {
        request: GrpcChatRequest;
        write(chunk: GrpcChatChunk): void;
        end(): void;
      }
    ) => {
      try {
        const response = await router.chatSync({
          model: call.request.model,
          input: call.request.input,
          stream: true
        });
        response.output.forEach((message) => {
          call.write({ type: message.role, delta: message.content });
        });
        call.write({ type: 'done', delta: '' });
        call.end();
      } catch (error) {
        options.logger?.error?.('gRPC ChatStream failed', error);
        call.end();
      }
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.bindAsync(
      `${host}:${port}`,
      ServerCredentials.createInsecure(),
      (err) => {
        if (err) {
          options.logger?.error?.('Failed to bind gRPC server', err);
          reject(err);
          return;
        }
        server.start();
        options.logger?.info?.(`AIal gRPC listening on :${port}`);
        resolve();
      }
    );
  });

  return server;
};
