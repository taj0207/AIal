#!/usr/bin/env node
/**
 * Minimal example demonstrating how to consume the AIal router-core library
 * directly inside a Node.js application. The script configures the router
 * using the built-in adapter context so that you only interact with unified
 * model names (for example `openai/gpt-4o-mini`) without wiring individual
 * vendor SDKs or REST calls yourself.
 *
 * Usage:
 *   node examples/library-usage.mjs
 *
 * Provide the question via CLI arguments to skip the interactive prompt:
 *   node examples/library-usage.mjs "What is AIal?"
 *
 * Required environment:
 *   One of the following provider keys so the context can reach a real LLM:
 *     - OPENAI_API_KEY
 *     - GEMINI_API_KEY or GOOGLE_API_KEY
 *     - XAI_API_KEY or GROK_API_KEY
 *     - ANTHROPIC_API_KEY
 *
 * Optional environment:
 *   AIAL_MODEL          Fully-qualified model name (default chosen by context)
 *   OPENAI_* / GEMINI_* / XAI_* / ANTHROPIC_* configuration overrides
 *
 * Prerequisites:
 *   1. npm install
 *   2. Export at least one provider API key (for example OPENAI_API_KEY)
 */

let Router;
let configureDefaultContext;
let createInterface;
let input;
let output;

try {
  ({ Router, configureDefaultContext } = await import('@aial/router-core'));
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

  let context;
  try {
    context = configureDefaultContext(router, {
      defaultModel: process.env.AIAL_MODEL
    });
  } catch (error) {
    console.error('\nFailed to configure the AIal context.');
    console.error(error.message);
    process.exit(1);
  }

  const question = await askForQuestion();

  const response = await router.chatSync({
    model: context.defaultModel,
    input: [
      { role: 'system', content: 'You are a friendly assistant.' },
      { role: 'user', content: question }
    ]
  });

  console.log(`\nUsing model: ${context.defaultModel}`);
  console.log('\nAIal library response:');
  console.log(JSON.stringify(response, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
