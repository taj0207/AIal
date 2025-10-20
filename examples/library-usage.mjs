#!/usr/bin/env node
/**
 * Minimal example demonstrating how to consume the AIal router-core library directly.
 *
 * Usage:
 *   node examples/library-usage.mjs
 *
 * You can also pass a question via CLI arguments instead of the interactive
 * prompt:
 *   node examples/library-usage.mjs "What is AIal?"
 *
 * Prerequisite:
 *   npm install
 */

let Router;
let prefixMatcher;
let EchoAdapter;
let createInterface;
let input;
let output;

try {
  ({ Router, prefixMatcher } = await import('@aial/router-core'));
  ({ EchoAdapter } = await import('@aial/router-core/src/adapters/echo.js'));
  ({ createInterface } = await import('node:readline/promises'));
  ({ stdin: input, stdout: output } = await import('node:process'));
} catch (error) {
  if (error?.code === 'ERR_MODULE_NOT_FOUND') {
    console.error(
      'The @aial/router-core workspace dependency is missing. Run `npm install` from the repository root and try again.'
    );
    process.exit(1);
  }
  throw error;
}

const DEFAULT_QUESTION = 'Can you tell me an interesting fact about the AIal project?';

async function askForQuestion() {
  const fromArgs = process.argv.slice(2).join(' ').trim();
  if (fromArgs) {
    return fromArgs;
  }

  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(
      `Enter your question (press enter to use the default: "${DEFAULT_QUESTION}"): `
    );
    return answer.trim() || DEFAULT_QUESTION;
  } finally {
    rl.close();
  }
}

async function main() {
  const router = new Router();

  // Register a simple echo adapter for models that start with `local/`.
  // Replace this with your own adapter (for example, wiring to the AIal
  // daemon or a cloud provider) to run against a real LLM.
  router.registerAdapter('local', new EchoAdapter('local'), [prefixMatcher('local/')]);

  const question = await askForQuestion();

  const response = await router.chatSync({
    model: 'local/demo-assistant',
    input: [
      { role: 'system', content: 'You are a friendly assistant.' },
      { role: 'user', content: question }
    ]
  });

  console.log('\nAIal library response:');
  console.log(JSON.stringify(response, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
