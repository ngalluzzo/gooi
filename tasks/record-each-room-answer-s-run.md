---
status: done
created: 2026-11-03
finished: 2026-11-03
---

# Record each room answer's run

Save what produced each agent answer: the prompt (by artifact ID), the backing and model, the instructions, the tool names and the ACP session. The reply's Matrix event carries the run's ID in a namespaced content field. Answers from before this slice have no record.
