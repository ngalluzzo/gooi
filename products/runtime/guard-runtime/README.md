# @gooi/guard-runtime

Canonical runtime evaluator for collection invariants and action/signal/flow/projection guards.

## Features

- Layered structural-first, semantic-second guard evaluation
- Primitive matrix enforcement across collection/action/signal/flow/projection
- Deterministic guard policy outcomes (`abort`, `fail_action`, `log_and_continue`, `emit_violation`)
- Semantic judge confidence + sampling behavior by environment
- Typed guard diagnostics and `guard.violated` signal emission

## API

- `evaluateGuard(input)`
- `evaluateInvariant(input)`
