---
status: open
created: 2026-11-04
---

# Secure nooq documents so agents can only suggest

Today nooq documents on gooi are unsecured: changes are attributed but not signed, and only which surface offers accept keeps agents from changing content. Secured documents (DM-12, DM-13) would sign every transaction with an actor key, grant agents nooq's suggester role so nooq itself denies anything else, and let loading use nooq's verifyLog and verifyStoredDocument. Needs keys kept for the owner and each agent.
