#!/usr/bin/env node
/**
 * Minimal example demonstrating how to consume the AIal router-core library directly.
 *
 * Usage:
 *   node examples/library-usage.mjs
 *
 * Prerequisite:
 *   npm install
 */

let Router;
let prefixMatcher;
let EchoAdapter;

try {
  ({ Router, prefixMatcher } = await import('@aial/router-core'));
  ({ EchoAdapter } = await import('@aial/router-core/src/adapters/echo.js'));
} catch (error) {
  if (error?.code === 'ERR_MODULE_NOT_FOUND') {
    console.error(
      'The @aial/router-core workspace dependency is missing. Run `npm install` from the repository root and try again.'
    );
    process.exit(1);
  }
  throw error;
}

async function main() {
  const router = new Router();

  // Register a simple echo adapter that will be used for any model name
  // that starts with `local/`. In a real project you would register
  // adapters such as OpenAI, Gemini, or Anthropic instead.
  router.registerAdapter('local', new EchoAdapter('local'), [prefixMatcher('local/')]);

  const response = await router.chatSync({
    model: 'local/assistant',
    input: [
      { role: 'system', content: 'You are a friendly assistant.' },
      { role: 'user', content: 'How do I call the router-core library?' }
    ]
  });

  console.log('AIal library response:');
  console.log(JSON.stringify(response, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
