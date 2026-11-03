---
status: done
created: 2026-11-03
finished: 2026-11-03
---

# Back the agent with Claude and with OMLx

backings/claude uses the Anthropic SDK (Claude Opus 5.5, refusal fallback on). backings/openai speaks the OpenAI-compatible API that OMLx serves (Qwen3.8-27B-Q8_0). Keys come from .env; edges never see them.
