# AIal — System Design (摘要)

- Endpoints：/v1/chat.sync, /v1/chat.stream, /v1/raw, /v1/chat/completions（相容）
- Raw：完全 passthrough（只加觀測標頭）
- 部署：Docker / Cloud Run（timeout=3600, min-instances 可調）
- 模組化：library + daemon 雙形態
> 完整版請見你在 Canvas 內的《本機版 OpenRouter 風格代理層 — System Design (完整版)》；將會改名為 AIal 後續同步。
