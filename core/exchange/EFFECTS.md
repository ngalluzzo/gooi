# Effect contracts, version 1

An effectful edge uses the existing `Implementation`: an `Operation` signature
and `run(input: Artifact)`. Its implementation acts through a native binding and
returns a `Result` describing the outcome. This specification adds behavioral
obligations to contract documentation; it adds no envelope, dispatcher, retry
flag, provider registry, or execution API.

## What each effect contract must specify

| Question                | Required statement                                                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Input and output        | Exact versioned artifact contracts, readers, and relationships between their identities. Input may be ordinary content, as with HTML; a request envelope is not mandatory.                        |
| Native authority        | Which resources and permissions the host must bind, and when policy is checked. Data identifying a target or principal does not grant authority over it.                                          |
| Success boundary        | The native event that permits success to be exposed, including any atomicity or durability guarantee.                                                                                             |
| Evidence                | Claim contract, observation boundaries, scope, and exclusions. Identify the native facts an implementation must establish independently of JSON admission.                                        |
| Repetition and recovery | Identity scope, behavior of repeated/concurrent invocations, whether exact recovery exists, and what must be retained for how long.                                                               |
| Refusal and uncertainty | Which outcomes prove refusal and what they establish about earlier attempts. Missing replies, unclassified execution errors, and rejected returned evidence do not prove that no effect happened. |
| Lifetime                | Resource ownership, cancellation and disposal semantics, and whether receipts remain meaningful after the resource disappears.                                                                    |

## Shared obligations

1. Execute against the exact admitted input. Native handles, credentials, and
   policy functions remain in the host binding. An artifact or passed claim
   cannot supply its own execution authority.
2. Establish the promised native facts before exposing success. A pure result
   constructor creates a prospective assertion; it cannot perform or certify
   the effect. Admit prospective evidence before the success boundary where the
   contract requires it. Implementations own staging, cleanup, and rollback.
3. Keep evidence bounded to its stated event. Historical receipts do not imply
   present liveness, current head state, or a control capability. Kernel admission
   checks structure and pins; implementations and their conformance evidence
   establish the native assertions.
4. Preserve uncertainty when execution may have occurred. Exchange admission
   cannot undo effects. A claim with verdict `unknown` is evidence about a claim;
   a delivery with no known outcome is separate host state.
5. Honor the contract's repetition and lifetime rules. Neither `invoke` nor graph
   composition schedules retries, authorizes effects, or supplies compensation.
   Compatible artifact boundaries alone do not establish safe execution order.

Contracts own these guarantees; runtimes own the mechanisms that satisfy them.
Conformance must check the native boundary through an independent observation:
actual DOM for mounting, authoritative stored state for publication. A durability
promise requires restart and real process-loss tests. Portable reader tests
alone cannot qualify an implementation. Hardware power-loss guarantees require
separate evidence.

## Current applications

| Contract                                    | Success and lifetime                                                                                       | Repetition and recovery                                                                                                                            |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Browser mount](../browser-mount/README.md) | Connected passive document at activation; disposal removes the frame while the receipt remains historical. | One invocation per native binding. Concurrent/repeated calls refuse. A new binding mounts a new instance; there is no durable replay guarantee.    |
| [Commit](../commit/README.md)               | Exact candidate, head advancement, and complete request/result become durable atomically.                  | `(source, principal, requestId)` binds the exact input. Authorized replay returns the original result. Retention lasts for the source incarnation. |

[Source read](../source-read/README.md) applies the same boundary discipline to
native observation: one authorized, coherent head, with no promise of continued
freshness. Repeated reads may observe newer revisions; they do not use commit's
exact replay or retention protocol.

[Delivery](../../runtimes/sqlite-delivery/README.md) remains a commit-specific host
protocol, not another exchange operation. The host allocates request identity
before preparation; delivery retains the exact prepared request before sending.
It relies on commit's authorized replay lookup to distinguish conclusive refusals
from unresolved outcomes. Acknowledgement retires pending work while retaining
the identity binding. These rules do not apply to browser mounting.
