---
status: done
created: 2026-11-04
finished: 2026-11-04
---

# Repoint the web-search MCP server at its files under old/

The web-search MCP server still runs gooi/sdk/app/dist/cli.js with --directory gooi/community/tools/web-search. Those moved to old/ in the reset, so the server has failed to connect in every session since.

Found on 2026-11-04: repointing isn't enough. After installing old/'s locked dependencies (bun install --frozen-lockfile, which only added old/node_modules), the server starts and then stops with "Module dependsOn is a named map". old/sdk/app/src/module.ts requires `dependsOn` to be a named map, but old/community/tools/web-search/app.ts passes a list (`dependsOn: [runtime]`). old/'s own code was inconsistent at the reset, so making it run means editing old/, which is the owner's call. The other choice is removing the server (`claude mcp remove web-search -s user`), since Claude Code has web search built in.

Resolved on 2026-11-04: the owner chose removal. The server is gone from the user config (`claude mcp remove web-search -s user`), and the old/node_modules installed while checking it is deleted, so old/ is as it was.
