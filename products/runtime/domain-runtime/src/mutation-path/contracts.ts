import type { EffectKind } from "@gooi/capability-contracts/capability-port";
import type {
	CompiledGuardDefinition,
	CompiledGuardPolicyPlan,
	CompiledInvariantDefinition,
} from "@gooi/guard-contracts/plans";
import type { SemanticJudgePort } from "@gooi/guard-contracts/ports";
import type { PrincipalContext } from "@gooi/host-contracts/principal";
import type { SignalEnvelope } from "@gooi/surface-contracts/envelope";
import type { DomainRuntimeMode } from "../execution-core/envelopes";

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
	/** Optional collection invariants evaluated before step invocation. */
	readonly invariants?: readonly CompiledInvariantDefinition[];
}

/**
 * Action-level guard plan declarations.
 */
export interface DomainActionGuardPlan {
	/** Guard evaluated before the first step executes. */
	readonly pre?: CompiledGuardDefinition;
	/** Guard evaluated after all steps complete and before result finalization. */
	readonly post?: CompiledGuardDefinition;
}

/**
 * Signal guard binding for emitted signal ids.
 */
export interface DomainSignalGuardPlan {
	/** Signal id this guard applies to. */
	readonly signalId: string;
	/** Guard definition evaluated against emitted signal context. */
	readonly definition: CompiledGuardDefinition;
}

/**
 * Flow guard binding evaluated on action outcome context.
 */
export interface DomainFlowGuardPlan {
	/** Flow id represented by this guard binding. */
	readonly flowId: string;
	/** Guard definition evaluated against flow outcome context. */
	readonly definition: CompiledGuardDefinition;
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
	/** Optional action pre/post guards. */
	readonly guards?: DomainActionGuardPlan;
	/** Optional emitted-signal guard bindings keyed by signal id. */
	readonly signalGuards?: readonly DomainSignalGuardPlan[];
	/** Optional flow-outcome guard bindings. */
	readonly flowGuards?: readonly DomainFlowGuardPlan[];
	/** Session outcome policy applied after action classification. */
	readonly session: DomainSessionOutcomePolicy;
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

/**
 * Domain guard runtime dependencies for action/signal/flow evaluation.
 */
export interface DomainGuardRuntime {
	/** Optional global guard policy defaults. */
	readonly policyPlan?: CompiledGuardPolicyPlan;
	/** Optional semantic judge capability used by semantic guard tiers. */
	readonly semanticJudge?: SemanticJudgePort;
}
