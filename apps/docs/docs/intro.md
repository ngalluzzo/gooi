---
id: intro
title: Gooi Documentation
slug: /
---

Gooi is a capability orchestration and execution platform built around explicit runtime contracts. It provides the infrastructure for authoring, binding, and executing capabilities across multiple runtime environments.

## What's here

### [API Reference](./api)

TypeDoc-generated reference for all packages, organized by product area:

- **Core Contracts** — host ports, capability contracts, surface envelopes, binding, and projection plans
- **Authoring** — language server, compiler, capability index, and symbol graph
- **Runtime** — provider, entrypoint, surface, projection, and domain runtimes
- **Quality** — conformance test suites for providers, entrypoints, and authoring
- **Marketplace** — marketplace-published capability providers

### [Engineering](./engineering)

Internal engineering documentation:

- **RFCs** — design proposals and architecture decisions (RFC-0001 through current)
- **Provider authoring** — how to build and publish capability providers
- **Commit and TSDoc standards** — code and documentation conventions

## Quick links

| Package | Purpose |
|---|---|
| `@gooi/host-contracts` | Interfaces for host-side capability provision |
| `@gooi/capability-contracts` | Capability port and provider manifest definitions |
| `@gooi/surface-contracts` | Invocation and signal envelope protocol |
| `@gooi/binding` | Capability binding resolution and lockfile |
| `@gooi/provider-runtime` | Execution engine for providers |
| `@gooi/language-server` | LSP implementation for authoring IDE support |
| `@gooi/conformance` | Conformance test suites |

## Regenerating docs

```bash
# Generate API reference from TypeDoc
bun run docs:api

# Sync engineering docs (RFCs, standards)
bun run docs:sync

# Start dev server with everything
bun run docs:site:dev
```
