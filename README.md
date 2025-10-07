# AIal — AI Abstract Layer (Open Source, BYOK)

> 一個可本地或部署到 Cloud Run 的 **OpenAI 相容 + 自定義 API** 的多供應商 LLM 代理層。
> 本專案 **不收費**、**不托管金鑰**，使用者 **Bring Your Own Key (BYOK)**。

## 特色
- ✅ OpenAI 相容端點：`/v1/chat/completions`、`/v1/responses`
- ✅ 自定義端點：`/v1/chat.sync`、`/v1/chat.stream`、`/v1/raw`（原樣透傳）
- ✅ 多供應商 Adapter：OpenAI / Anthropic / xAI / Google（骨架）
- ✅ Cloud Run 或 Docker 一鍵部署
- ✅ BYOK：金鑰從環境變數或 Secret 注入，不落地

## 快速開始（Docker）
```bash
docker build -t aial:dev .
docker run --rm -p 4000:4000   -e AIAL_MASTER_KEY=sk-local-123   -e OPENAI_API_KEY=your-openai-key   aial:dev
```

## API
- OpenAPI 規格：`openapi/openapi.yaml`
- gRPC（可選）：`proto/chat.proto`
- 設計文件：`docs/system-design.md`
