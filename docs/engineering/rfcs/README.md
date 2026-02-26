# RFCs

This directory stores product-engineering RFCs for Gooi.

Each RFC is a merged PRD + technical design document:

- Product intent and outcomes are explicit.
- Engineering design and boundaries are explicit.
- Acceptance criteria and rollout are explicit.

RFCs are the source of truth for behavior changes that affect public contracts,
runtime semantics, or platform capabilities.

## Naming

- File format: `RFC-XXXX-short-kebab-title.md`
- `XXXX` is zero-padded, monotonically increasing.
- Example: `RFC-0001-capability-contract-and-provider-runtime-interface.md`

## Lifecycle

- `Draft`: actively authored, not approved.
- `Proposed`: ready for review, pending decision.
- `Accepted`: approved and scheduled.
- `In Progress`: implementation started.
- `Implemented`: code landed and verified.
- `Superseded`: replaced by a newer RFC.
- `Rejected`: explicitly not moving forward.

Status changes must be reflected in RFC metadata and decision log.

## Authoring rules

- Write around product features and outcomes, not architecture-first narratives.
- Define explicit boundaries and typed contracts.
- Keep modules and APIs self-documenting.
- Do not leak concerns across surface, kernel, provider, and host boundaries.
- Avoid OOP in design examples; prefer functional modules and pure data contracts.
- Do not use barrel files for public APIs; use package `exports`.

See style standards:
- [commit-and-tsdoc-standards.md](/Users/ngalluzzo/repos/gooi/docs/engineering/commit-and-tsdoc-standards.md)

## Required sections

Use [RFC-TEMPLATE.md](/Users/ngalluzzo/repos/gooi/docs/engineering/rfcs/RFC-TEMPLATE.md).

Minimum required sections:

1. Metadata
2. Problem and context
3. Goals and non-goals
4. Product outcomes and success metrics
5. Proposal
6. Boundaries and ownership
7. Contracts and typing
8. Delivery plan and rollout
9. Test strategy and acceptance criteria
10. Risks and mitigations
11. Open questions
12. Decision log

