import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const loadGrpcDependencies = async () => {
  try {
    const protoLoader = await import('@grpc/proto-loader');
    const grpc = await import('@grpc/grpc-js');
    return {
      loadSync: protoLoader.loadSync,
      loadPackageDefinition: grpc.loadPackageDefinition,
      createServer: () => new grpc.Server(),
      createCredentials: () => grpc.ServerCredentials.createInsecure()
    };
  } catch (error) {
    return { error };
  }
};

const mapStreamOutput = (response) => {
  return response.output.map((message) => ({ type: message.role, delta: message.content }));
};

export const startGrpcServer = async (router, options = {}) => {
  const modules = await loadGrpcDependencies();

  if (modules.error) {
    options.logger?.info?.(
      'gRPC dependencies not found. Install @grpc/grpc-js and @grpc/proto-loader to enable gRPC.'
    );
    return null;
  }

  const host = options.host ?? '0.0.0.0';
  const port = options.port ?? 50051;
  const protoPath = join(dirname(fileURLToPath(import.meta.url)), '../../../proto/chat.proto');
  const packageDefinition = modules.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });
  const descriptor = modules.loadPackageDefinition(packageDefinition);
  const service = descriptor?.aial?.v1?.Router?.service;
  if (!service) {
    throw new Error('Unable to load gRPC router service definition');
  }

  const server = modules.createServer();
  server.addService(service, {
    ChatSync: async (call, callback) => {
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
    ChatStream: async (call) => {
      try {
        const response = await router.chatSync({
          model: call.request.model,
          input: call.request.input,
          stream: true
        });
        for (const chunk of mapStreamOutput(response)) {
          call.write(chunk);
        }
        call.write({ type: 'done', delta: '' });
        call.end();
      } catch (error) {
        options.logger?.error?.('gRPC ChatStream failed', error);
        call.end();
      }
    }
  });

  await new Promise((resolve, reject) => {
    server.bindAsync(
      `${host}:${port}`,
      modules.createCredentials(),
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
