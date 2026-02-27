import type { BindingPlan } from "@gooi/binding/binding-plan/contracts";
import type { DeploymentLockfile } from "@gooi/binding/lockfile/contracts";
import type { CapabilityPortContract } from "@gooi/capability-contracts/capability-port";
import type { ProviderModule } from "@gooi/provider-runtime";

/**
 * Named conformance checks for provider-runtime behavior.
 */
export type ProviderConformanceCheckId =
	| "activation_succeeds"
	| "invalid_input_rejected"
	| "valid_input_succeeds"
	| "declared_effects_enforced";

/**
 * Result for one provider conformance check.
 */
export interface ProviderConformanceCheckResult {
	/** Stable check identifier. */
	readonly id: ProviderConformanceCheckId;
	/** True when the check passed. */
	readonly passed: boolean;
	/** Human-readable check detail. */
	readonly detail: string;
}

/**
 * Conformance report for one provider module.
 */
export interface ProviderConformanceReport {
	/** Provider id under test. */
	readonly providerId: string;
	/** Host API version used during evaluation. */
	readonly hostApiVersion: string;
	/** Aggregate pass status. */
	readonly passed: boolean;
	/** Individual check outcomes. */
	readonly checks: readonly ProviderConformanceCheckResult[];
}

/**
 * Input required for provider conformance checks.
 */
export interface RunProviderConformanceInput {
	/** Provider module under test. */
	readonly providerModule: ProviderModule;
	/** Host API version used for activation. */
	readonly hostApiVersion: string;
	/** Capability contract exercised by conformance test. */
	readonly contract: CapabilityPortContract;
	/** Valid input expected to pass contract validation. */
	readonly validInput: unknown;
	/** Invalid input expected to fail contract validation. */
	readonly invalidInput: unknown;
	/** Optional plan artifact for activation enforcement. */
	readonly bindingPlan?: BindingPlan;
	/** Optional lockfile artifact for activation enforcement. */
	readonly lockfile?: DeploymentLockfile;
}
