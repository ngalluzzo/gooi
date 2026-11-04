---
status: done
created: 2026-11-04
finished: 2026-11-04
---

# Keep nooq documents on the log the way DM-14.6 says

Each document's state is stored beside its header in nooq's canonical encoding, with its history store beside it, on a gooi log stream. Loading a document rebuilds and verifies it with nooq's own verifyLog and verifyStoredDocument, never with gooi's checks. JSONL and SQLite both work through GOOI_STORE.

Built on 2026-11-04 with one difference: these documents are unsecured, so their history is plain transactions, and nooq's verifyLog and verifyStoredDocument only apply to signed envelopes in secured documents. Opening a document instead replays its transactions with nooq's applyTransaction and compares nooq rootDigests of the replay and the stored state. Secured documents, with agents granted nooq's suggester role, are the follow-up that makes verifyLog apply.
