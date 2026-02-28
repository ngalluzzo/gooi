import type { EffectKind } from "@gooi/capability-contracts/capability-port";
import type { SignalEnvelope } from "@gooi/surface-contracts/envelope";
import type { DomainRuntimeTypedError } from "./errors";

/**
 * Envelope version for domain runtime execution payloads.
 */
export const domainRuntimeEnvelopeVersion = "1.0.0" as const;

/**
 * Domain runtime execution mode.
 */
export type DomainRuntimeMode = "live" | "simulation";

/**
 * Step-level trace record emitted by domain runtime execution.
 */
export interface DomainTraceStep {
	/** Action step identifier. */
	readonly stepId: string;
	/** Capability identifier attached to this step when applicable. */
	readonly capabilityId?: string;
	/** Trace phase kind. */
	readonly phase:
		| "resolve_input"
		| "validate_contract"
		| "invoke"
		| "guard"
		| "session";
	/** Deterministic step status. */
	readonly status: "ok" | "error" | "skipped";
	/** Optional structured detail payload for diagnostics. */
	readonly detail?: Readonly<Record<string, unknown>>;
}

/**
 * Domain runtime trace envelope.
 */
export interface DomainTraceEnvelope {
	/** Runtime execution mode. */
	readonly mode: DomainRuntimeMode;
	/** Entrypoint id associated with this run. */
	readonly entrypointId: string;
	/** Action id resolved for this run. */
	readonly actionId?: string;
	/** Invocation id propagated from runtime context. */
	readonly invocationId: string;
	/** Trace id propagated from runtime context. */
	readonly traceId: string;
	/** Ordered action/capability step trace entries. */
	readonly steps: readonly DomainTraceStep[];
}

/**
 * Session outcome envelope emitted after action execution.
 */
export interface DomainSessionOutcomeEnvelope {
	/** Session outcome envelope version. */
	readonly envelopeVersion: typeof domainRuntimeEnvelopeVersion;
	/** Session outcome status. */
	readonly status: "cleared" | "preserved" | "skipped";
	/** Session outcome reason. */
	readonly reason: "success" | "failure" | "no_policy";
}

/**
 * Domain mutation execution envelope.
 */
export interface DomainMutationEnvelope {
	/** Domain mutation envelope version. */
	readonly envelopeVersion: typeof domainRuntimeEnvelopeVersion;
	/** Runtime execution mode. */
	readonly mode: DomainRuntimeMode;
	/** Mutation entrypoint id. */
	readonly entrypointId: string;
	/** Resolved action id. */
	readonly actionId: string;
	/** True when action execution succeeded. */
	readonly ok: boolean;
	/** Output payload when `ok` is true. */
	readonly output?: unknown;
	/** Typed domain runtime error when `ok` is false. */
	readonly error?: DomainRuntimeTypedError;
	/** Runtime-observed effects with deterministic ordering. */
	readonly observedEffects: readonly EffectKind[];
	/** Emitted signal envelopes in deterministic order. */
	readonly emittedSignals: readonly SignalEnvelope[];
	/** Applied session outcome envelope. */
	readonly sessionOutcome: DomainSessionOutcomeEnvelope;
	/** Domain runtime trace envelope. */
	readonly trace: DomainTraceEnvelope;
}

/**
 * Domain query execution envelope.
 */
export interface DomainQueryEnvelope {
	/** Domain query envelope version. */
	readonly envelopeVersion: typeof domainRuntimeEnvelopeVersion;
	/** Runtime execution mode. */
	readonly mode: DomainRuntimeMode;
	/** Query entrypoint id. */
	readonly entrypointId: string;
	/** True when query execution succeeded. */
	readonly ok: boolean;
	/** Output payload when `ok` is true. */
	readonly output?: unknown;
	/** Typed domain runtime error when `ok` is false. */
	readonly error?: DomainRuntimeTypedError;
	/** Runtime-observed effects with deterministic ordering. */
	readonly observedEffects: readonly EffectKind[];
	/** Query execution trace envelope. */
	readonly trace: DomainTraceEnvelope;
}

/**
 * Checks whether simulation/live mutation envelopes are structurally comparable.
 */
export const areDomainMutationEnvelopesComparable = (
	live: DomainMutationEnvelope,
	simulation: DomainMutationEnvelope,
): boolean => {
	if (live.entrypointId !== simulation.entrypointId) {
		return false;
	}
	if (live.actionId !== simulation.actionId) {
		return false;
	}
	if (live.ok !== simulation.ok) {
		return false;
	}
	const liveStepIds = live.trace.steps.map((step) => step.stepId);
	const simulationStepIds = simulation.trace.steps.map((step) => step.stepId);
	if (liveStepIds.length !== simulationStepIds.length) {
		return false;
	}
	for (let index = 0; index < liveStepIds.length; index += 1) {
		if (liveStepIds[index] !== simulationStepIds[index]) {
			return false;
		}
	}
	return true;
};
