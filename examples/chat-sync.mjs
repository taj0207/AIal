#!/usr/bin/env node
/**
 * Minimal example demonstrating how to call the AIal chat.sync endpoint.
 *
 * Usage:
 *   AIAL_MASTER_KEY=sk-local-123 node examples/chat-sync.mjs
 */

const API_URL = process.env.AIAL_URL ?? 'http://localhost:4000';
const MASTER_KEY = process.env.AIAL_MASTER_KEY ?? 'sk-local-123';

async function main() {
  const response = await fetch(`${API_URL}/v1/chat.sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MASTER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Give me a fun fact about AIal.' },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Request failed with status ${response.status}: ${errorBody}`);
  }

  const payload = await response.json();
  console.log('AIal response:');
  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
