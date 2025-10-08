# AIal - System Design (Summary)

- Endpoints: `/v1/chat.sync`, `/v1/chat.stream`, `/v1/raw`, `/v1/chat/completions`
- Raw: passthrough with observation headers only
- Deployment: Docker or Cloud Run (configurable timeouts and minimum instances)
- Modular layout: shared router library plus HTTP daemon
> Refer to the internal "Local OpenRouter Style Gateway - System Design (Full Version)" document for additional detail. The material will be renamed to AIal in future updates.
