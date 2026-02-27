import type { EffectKind } from "@gooi/capability-contracts/capability-port";
import type { PrincipalContext } from "@gooi/host-contracts/principal";
import type { SignalEnvelope } from "@gooi/surface-contracts/signal-envelope";
import type { DomainRuntimeMode } from "./envelopes";

/**
 * Value source for action step input resolution.
 */
export type DomainValueSource =
	| { readonly kind: "input"; readonly path: string }
	| { readonly kind: "literal"; readonly value: unknown };

/**
 * Capability input contract validated before invocation.
 */
export interface DomainCapabilityInputContract {
	/** Required input keys. */
	readonly requiredKeys: readonly string[];
	/** Optional allowed input keys when unknown keys are disallowed. */
	readonly allowedKeys?: readonly string[];
	/** Allows unknown keys when true. */
	readonly allowUnknownKeys?: boolean;
}

/**
 * Action step input plan.
 */
export interface DomainActionStepInputPlan {
	/** Field value sources keyed by capability input field. */
	readonly fields: Readonly<Record<string, DomainValueSource>>;
	/** Defaults applied when resolved value is `undefined`. */
	readonly defaults?: Readonly<Record<string, unknown>>;
}

/**
 * Action step execution plan.
 */
export interface DomainActionStepPlan {
	/** Stable step identifier. */
	readonly stepId: string;
	/** Target capability identifier. */
	readonly capabilityId: string;
	/** Deterministic input resolution plan for this step. */
	readonly input: DomainActionStepInputPlan;
}

/**
 * Session outcome policy for one action plan.
 */
export interface DomainSessionOutcomePolicy {
	/** Session behavior on success. */
	readonly onSuccess: "clear" | "preserve";
	/** Session behavior on failure. */
	readonly onFailure: "clear" | "preserve";
}

/**
 * Domain action execution plan.
 */
export interface DomainActionPlan {
	/** Stable action identifier. */
	readonly actionId: string;
	/** Ordered action step plans. */
	readonly steps: readonly DomainActionStepPlan[];
	/** Session outcome policy applied after action classification. */
	readonly session: DomainSessionOutcomePolicy;
}

/**
 * Domain query handler contract.
 */
export interface DomainQueryHandler {
	/** Runs one deterministic query path. */
	readonly run: (input: {
		readonly entrypointId: string;
		readonly input: Readonly<Record<string, unknown>>;
		readonly principal: PrincipalContext;
		readonly ctx: {
			readonly invocationId: string;
			readonly traceId: string;
			readonly now: string;
			readonly mode: DomainRuntimeMode;
		};
	}) => Promise<{
		readonly ok: boolean;
		readonly output?: unknown;
		readonly error?: unknown;
		readonly observedEffects: readonly EffectKind[];
	}>;
}

/**
 * Capability invocation input payload.
 */
export interface DomainCapabilityInvocationInput {
	/** Target capability identifier. */
	readonly capabilityId: string;
	/** Capability input payload. */
	readonly input: Readonly<Record<string, unknown>>;
	/** Principal context for invocation. */
	readonly principal: PrincipalContext;
	/** Runtime invocation context. */
	readonly ctx: {
		readonly invocationId: string;
		readonly traceId: string;
		readonly now: string;
		readonly mode: DomainRuntimeMode;
	};
}

/**
 * Capability invocation result payload.
 */
export interface DomainCapabilityInvocationResult {
	/** True when invocation succeeded. */
	readonly ok: boolean;
	/** Output payload when `ok` is true. */
	readonly output?: unknown;
	/** Error payload when `ok` is false. */
	readonly error?: unknown;
	/** Observed capability effects. */
	readonly observedEffects: readonly EffectKind[];
	/** Optional emitted signals produced by capability execution. */
	readonly emittedSignals?: readonly SignalEnvelope[];
}

/**
 * Capability handler contract used by action execution plans.
 */
export interface DomainCapabilityHandler {
	/** Stable capability identifier. */
	readonly capabilityId: string;
	/** Capability input contract validated before invocation. */
	readonly contract: DomainCapabilityInputContract;
	/** Live invocation handler. */
	readonly invoke: (
		input: DomainCapabilityInvocationInput,
	) => Promise<DomainCapabilityInvocationResult>;
	/** Optional simulation invocation handler. */
	readonly simulate?: (
		input: DomainCapabilityInvocationInput,
	) => Promise<DomainCapabilityInvocationResult>;
}
