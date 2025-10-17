#!/usr/bin/env node
/**
 * Minimal example demonstrating how to consume the AIal router-core library directly.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node examples/library-usage.mjs
 *
 * You can also pass a question via CLI arguments instead of the interactive
 * prompt:
 *   OPENAI_API_KEY=sk-... node examples/library-usage.mjs "What is AIal?"
 *
 * Prerequisite:
 *   npm install
 */

let Router;
let prefixMatcher;
let OpenAIAdapter;
let createInterface;
let input;
let output;

try {
  ({ Router, prefixMatcher } = await import('@aial/router-core'));
  ({ OpenAIAdapter } = await import('@aial/router-core/src/adapters/openai.js'));
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
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.AIAL_OPENAI_API_KEY;
  if (!apiKey) {
    console.error(
      'Set the OPENAI_API_KEY (or AIAL_OPENAI_API_KEY) environment variable to run this example with the OpenAI adapter.'
    );
    process.exit(1);
  }

  const router = new Router();

  // Register the OpenAI adapter so every model prefixed with `openai/`
  // is routed through OpenAI's API.
  router.registerAdapter('openai', new OpenAIAdapter({ apiKey }), [prefixMatcher('openai/')]);

  const question = await askForQuestion();

  const response = await router.chatSync({
    model: 'openai/gpt-4o-mini',
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
