import type { EffectKind } from "@gooi/contracts-capability";
import type { CompiledEntrypointKind } from "@gooi/spec-compiler/contracts";

/**
 * Envelope version identifier used by invocation and result payloads.
 */
export type EnvelopeVersion = "1.0.0";

/**
 * Principal context passed across entrypoint execution boundaries.
 */
export interface PrincipalContext {
	/** Principal subject id, or null for anonymous callers. */
	readonly subject: string | null;
	/** Unstructured claims used for role derivation. */
	readonly claims: Readonly<Record<string, unknown>>;
	/** Pre-computed role tags asserted by the calling adapter. */
	readonly tags: readonly string[];
}

/**
 * Invocation envelope produced before executing a query or mutation.
 */
export interface InvocationEnvelope<Input> {
	/** Envelope version for compatibility checks. */
	readonly envelopeVersion: EnvelopeVersion;
	/** Trace id for observability across runtime boundaries. */
	readonly traceId: string;
	/** Invocation id unique in host runtime scope. */
	readonly invocationId: string;
	/** Entrypoint identifier resolved from binding. */
	readonly entrypointId: string;
	/** Entrypoint kind (`query` or `mutation`). */
	readonly entrypointKind: CompiledEntrypointKind;
	/** Principal context used by policy checks and domain execution. */
	readonly principal: PrincipalContext;
	/** Bound input payload after defaults and coercion. */
	readonly input: Input;
	/** Invocation metadata for idempotency and audit. */
	readonly meta: {
		/** Optional key for mutation replay semantics. */
		readonly idempotencyKey?: string;
		/** Timestamp when runtime accepted the request. */
		readonly requestReceivedAt: string;
	};
}

/**
 * Structured typed error envelope returned on failed execution.
 */
export interface TypedErrorEnvelope<TypedError> {
	/** Envelope version for compatibility checks. */
	readonly envelopeVersion: EnvelopeVersion;
	/** Stable error code used by clients and retry logic. */
	readonly code: string;
	/** Human-readable message describing the failure. */
	readonly message: string;
	/** True when retrying the request may succeed. */
	readonly retryable: boolean;
	/** Optional structured debug details. */
	readonly details?: Readonly<Record<string, unknown>>;
	/** Optional typed domain error payload. */
	readonly typed?: TypedError;
}

/**
 * Signal envelope emitted by mutation execution.
 */
export interface SignalEnvelope {
	/** Envelope version for compatibility checks. */
	readonly envelopeVersion: EnvelopeVersion;
	/** Signal identifier emitted by mutation. */
	readonly signalId: string;
	/** Signal version emitted by runtime. */
	readonly signalVersion: number;
	/** Optional payload included for observability paths. */
	readonly payload?: Readonly<Record<string, unknown>>;
	/** Hash of normalized signal payload. */
	readonly payloadHash: string;
	/** ISO-8601 timestamp when signal was emitted. */
	readonly emittedAt: string;
}

/**
 * Refresh trigger derived from mutation signal output.
 */
export interface RefreshTrigger {
	/** Signal identifier used for refresh matching. */
	readonly signalId: string;
	/** Signal version for compatibility checks. */
	readonly signalVersion: number;
	/** Payload hash associated with the emitted signal. */
	readonly payloadHash: string;
}

/**
 * Result envelope returned by entrypoint runtime execution.
 */
export interface ResultEnvelope<Output, TypedError> {
	/** Envelope version for compatibility checks. */
	readonly envelopeVersion: EnvelopeVersion;
	/** Trace id propagated from invocation envelope. */
	readonly traceId: string;
	/** Invocation id propagated from invocation envelope. */
	readonly invocationId: string;
	/** True when execution produced output payload. */
	readonly ok: boolean;
	/** Output payload when `ok` is true. */
	readonly output?: Output;
	/** Typed error envelope when `ok` is false. */
	readonly error?: TypedErrorEnvelope<TypedError>;
	/** Signals emitted during mutation execution. */
	readonly emittedSignals: readonly SignalEnvelope[];
	/** Observed side effects from domain/provider execution. */
	readonly observedEffects: readonly EffectKind[];
	/** Timing metadata captured by runtime orchestration. */
	readonly timings: {
		/** Start timestamp for execution. */
		readonly startedAt: string;
		/** Completion timestamp for execution. */
		readonly completedAt: string;
		/** Duration in milliseconds between start and completion. */
		readonly durationMs: number;
	};
	/** Additional metadata for replay, artifact, and refresh behavior. */
	readonly meta: {
		/** True when result was served from idempotency replay store. */
		readonly replayed: boolean;
		/** Compiled artifact hash used for execution. */
		readonly artifactHash: string;
		/** Query ids affected by mutation refresh triggers. */
		readonly affectedQueryIds: readonly string[];
	};
}
