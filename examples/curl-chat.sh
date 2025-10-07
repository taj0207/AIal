#!/usr/bin/env bash
set -euo pipefail
curl -sS http://localhost:4000/v1/chat.sync   -H 'Content-Type: application/json'   -d '{"model":"openai/gpt-5","input":[{"role":"user","content":"Hello"}]}'
