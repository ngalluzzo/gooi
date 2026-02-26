# RFC-XXXX: <Title>

## Metadata

- RFC: `RFC-XXXX`
- Title: `<Title>`
- Status: `Draft | Proposed | Accepted | In Progress | Implemented | Superseded | Rejected`
- Owners: `<name(s)>`
- Reviewers: `<name(s)>`
- Created: `YYYY-MM-DD`
- Updated: `YYYY-MM-DD`
- Target release: `<milestone/date>`
- Related:
  - Spec: `<path(s)>`
  - Issues/PRs: `<link(s)>`
  - Supersedes/Superseded by: `<RFC-XXXX or none>`

## Problem and context

Describe the user or business problem and why now.

## Goals

List measurable goals.

## Non-goals

List explicit exclusions to control scope.

## Product outcomes and success metrics

Define outcomes, KPIs, and service-level expectations.

- Product metric(s):
- Reliability metric(s):
- Developer experience metric(s):
- Explicit latency/availability target(s) with numeric thresholds:

## Proposal

Describe the proposed solution as product behavior plus platform behavior.

Include deterministic runtime behavior rules:

- Input normalization order:
- Default precedence:
- Unknown/null handling:
- Stable ordering requirements:
- Idempotency/replay behavior (for write paths):

## Ubiquitous language

Define normalized terms used in product and code.

## Boundaries and ownership

Describe boundaries and what each boundary owns.

- Surface adapters:
- Kernel/domain runtime:
- Capability adapters:
- Host/platform adapters:

Define "must not cross" constraints.

## Contracts and typing

Define explicit contracts, schema strategy, and versioning.

- Boundary schema authority:
- Authoring format (for example, Zod-required):
- Generated runtime artifact format (for example, normalized JSON Schema):
- Canonical compiled artifact schema (required):
- Artifact version field and hash policy:
- Deterministic serialization rules:
- Allowed/disallowed schema features:
- Public contract shape:
- Invocation/result/error/signal/diagnostics envelope schemas:
- Envelope versioning strategy:
- Principal/auth context schema:
- Access evaluation order:
- Error taxonomy:
- Compatibility policy:
- Deprecation policy:

## API and module plan

Describe functional modules and package-level exports.

- Feature-oriented module layout:
- Public APIs via `package.json` exports:
- No barrel files:

Include concise code snippets when needed.

## Delivery plan and rollout

Phases with entry/exit criteria and migration plan.

For each phase, define:

- Entry criteria:
- Exit criteria:
- Deliverables:

## Test strategy and acceptance criteria

Define:

- Unit, integration, and end-to-end coverage expectations.
- Conformance tests (if contracts are cross-runtime).
- Determinism/golden tests for artifacts and envelopes (if applicable).
- Definition of done.

## Operational readiness

Define:

- Observability and tracing.
- Failure handling and retries.
- Security requirements.
- Runbooks and incident readiness.
- Alert thresholds tied to service-level targets.

## Risks and mitigations

List key risks with mitigation plans.

## Alternatives considered

Summarize rejected alternatives and rationale.

## Open questions

Track unresolved questions with owners and due dates.

## Decision log

- `YYYY-MM-DD` - `<decision>`
