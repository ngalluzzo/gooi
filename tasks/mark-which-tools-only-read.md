---
status: done
created: 2026-11-03
finished: 2026-11-03
---

# Mark which tools only read

The tasks toolbox marks list_tasks as read-only, after Smithy's smithy.api#readonly trait and HTTP's safe methods. During a replay, read-only tools run for real and every other tool call is recorded as what the agent would have done, never applied.
