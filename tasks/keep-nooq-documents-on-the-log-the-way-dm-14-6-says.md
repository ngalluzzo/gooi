---
status: open
created: 2026-11-04
---

# Keep nooq documents on the log the way DM-14.6 says

Each document's state is stored beside its header in nooq's canonical encoding, with its history store beside it, on a gooi log stream. Loading a document rebuilds and verifies it with nooq's own verifyLog and verifyStoredDocument, never with gooi's checks. JSONL and SQLite both work through GOOI_STORE.
