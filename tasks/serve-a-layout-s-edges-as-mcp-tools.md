---
status: done
created: 2026-11-03
finished: 2026-11-03
---

# Serve a layout's edges as MCP tools

A generic surface adapter on the official MCP TypeScript SDK, over stdio. Each command in a host's layout becomes a tool named group_command, with its edge's JSON Schema as the input schema and its description. Calls go through invoke; results come back as text content, and errors as tool errors. Interpreted at startup; nothing generated.
