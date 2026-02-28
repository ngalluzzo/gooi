import type {
	CompiledGuardDefinition,
	CompiledInvariantDefinition,
} from "@gooi/guard-contracts/plans";

/**
 * Version identifier for compiled domain runtime IR artifacts.
 */
export const compiledDomainRuntimeIRVersion = "1.0.0" as const;

/**
 * Version identifier for compiled session IR artifacts.
 */
export const compiledSessionIRVersion = "1.0.0" as const;

/**
 * Value source used for compiled mutation step-input bindings.
 */
export type CompiledDomainValueSource =
	| { readonly kind: "input"; readonly path: string }
	| { readonly kind: "literal"; readonly value: unknown };

/**
 * Compiled capability input contract validated before invocation.
 */
export interface CompiledDomainCapabilityInputContract {
	readonly requiredKeys: readonly string[];
	readonly allowedKeys?: readonly string[];
	readonly allowUnknownKeys?: boolean;
}

/**
 * Compiled action step input plan.
 */
export interface CompiledDomainActionStepInputPlan {
	readonly fields: Readonly<Record<string, CompiledDomainValueSource>>;
	readonly defaults?: Readonly<Record<string, unknown>>;
}

/**
 * Compiled action step execution plan.
 */
export interface CompiledDomainActionStepPlan {
	readonly stepId: string;
	readonly capabilityId: string;
	readonly input: CompiledDomainActionStepInputPlan;
	readonly invariants?: readonly CompiledInvariantDefinition[];
}

/**
 * Compiled action-level guard declarations.
 */
export interface CompiledDomainActionGuardPlan {
	readonly pre?: CompiledGuardDefinition;
	readonly post?: CompiledGuardDefinition;
}

/**
 * Compiled signal guard binding.
 */
export interface CompiledDomainSignalGuardPlan {
	readonly signalId: string;
	readonly definition: CompiledGuardDefinition;
}

/**
 * Compiled flow guard binding.
 */
export interface CompiledDomainFlowGuardPlan {
	readonly flowId: string;
	readonly definition: CompiledGuardDefinition;
}

/**
 * Compiled session outcome policy for one action.
 */
export interface CompiledDomainSessionOutcomePolicy {
	readonly onSuccess: "clear" | "preserve";
	readonly onFailure: "clear" | "preserve";
}

/**
 * Compiled action execution plan.
 */
export interface CompiledDomainActionPlan {
	readonly actionId: string;
	readonly steps: readonly CompiledDomainActionStepPlan[];
	readonly guards?: CompiledDomainActionGuardPlan;
	readonly signalGuards?: readonly CompiledDomainSignalGuardPlan[];
	readonly flowGuards?: readonly CompiledDomainFlowGuardPlan[];
	readonly session: CompiledDomainSessionOutcomePolicy;
}

/**
 * Compiled mutation-to-action plan.
 */
export interface CompiledDomainMutationPlan {
	readonly entrypointId: string;
	readonly actionId: string;
	readonly inputBindings: Readonly<Record<string, CompiledDomainValueSource>>;
}

/**
 * Compiled query entrypoint plan resolved by domain runtime.
 */
export interface CompiledDomainQueryPlan {
	readonly queryId: string;
}

/**
 * Compiled flow declaration used for scenario/guard references.
 */
export interface CompiledDomainFlowPlan {
	readonly flowId: string;
}

/**
 * Canonical compiled domain runtime IR consumed by mutation/query orchestration.
 */
export interface CompiledDomainRuntimeIR {
	readonly artifactVersion: typeof compiledDomainRuntimeIRVersion;
	readonly actions: Readonly<Record<string, CompiledDomainActionPlan>>;
	readonly mutations: Readonly<Record<string, CompiledDomainMutationPlan>>;
	readonly queries: Readonly<Record<string, CompiledDomainQueryPlan>>;
	readonly flows: Readonly<Record<string, CompiledDomainFlowPlan>>;
}

/**
 * Compiled session field contract consumed by runtime validation.
 */
export interface CompiledSessionFieldPlan {
	readonly fieldId: string;
	readonly definition: unknown;
	readonly required: boolean;
	readonly hasDefault: boolean;
}

/**
 * Canonical compiled session IR consumed by runtime/session semantics.
 */
export interface CompiledSessionIR {
	readonly artifactVersion: typeof compiledSessionIRVersion;
	readonly fields: Readonly<Record<string, CompiledSessionFieldPlan>>;
	readonly defaults: Readonly<Record<string, unknown>>;
}
