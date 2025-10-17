#!/usr/bin/env node
/**
 * Minimal example demonstrating how to consume the AIal router-core library directly.
 *
 * Usage:
 *   node examples/library-usage.mjs
 */

import { Router, prefixMatcher } from '@aial/router-core';
import { EchoAdapter } from '@aial/router-core/src/adapters/echo.js';

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
