import type {
	CompiledDomainActionGuardPlan,
	CompiledDomainActionPlan,
	CompiledDomainActionStepInputPlan,
	CompiledDomainActionStepPlan,
	CompiledDomainCapabilityInputContract,
	CompiledDomainFlowGuardPlan,
	CompiledDomainSessionOutcomePolicy,
	CompiledDomainSignalGuardPlan,
	CompiledDomainValueSource,
} from "@gooi/app-spec-contracts/compiled";
import type { EffectKind } from "@gooi/capability-contracts/capability-port";
import type { CompiledGuardPolicyPlan } from "@gooi/guard-contracts/plans";
import type { SemanticJudgePort } from "@gooi/guard-contracts/ports";
import type { PrincipalContext } from "@gooi/host-contracts/principal";
import type { SignalEnvelope } from "@gooi/surface-contracts/envelope";
import type { DomainRuntimeMode } from "../execution-core/envelopes";

export type DomainValueSource = CompiledDomainValueSource;
export type DomainCapabilityInputContract =
	CompiledDomainCapabilityInputContract;
export type DomainActionStepInputPlan = CompiledDomainActionStepInputPlan;
export type DomainActionStepPlan = CompiledDomainActionStepPlan;
export type DomainActionGuardPlan = CompiledDomainActionGuardPlan;
export type DomainSignalGuardPlan = CompiledDomainSignalGuardPlan;
export type DomainFlowGuardPlan = CompiledDomainFlowGuardPlan;
export type DomainSessionOutcomePolicy = CompiledDomainSessionOutcomePolicy;
export type DomainActionPlan = CompiledDomainActionPlan;

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

/**
 * Domain guard runtime dependencies for action/signal/flow evaluation.
 */
export interface DomainGuardRuntime {
	/** Optional global guard policy defaults. */
	readonly policyPlan?: CompiledGuardPolicyPlan;
	/** Optional semantic judge capability used by semantic guard tiers. */
	readonly semanticJudge?: SemanticJudgePort;
}
