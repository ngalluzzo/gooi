import type { CapabilityPortContract } from "@gooi/capability-contracts/capability-port";
import type { ConformanceCheckResultBase } from "@gooi/conformance-contracts/checks";
import type { ConformanceSuiteReportBase } from "@gooi/conformance-contracts/reports";
import type { JsonValue } from "@gooi/contract-primitives/json";
import type {
	BindingPlan,
	DeploymentLockfile,
} from "@gooi/marketplace-contracts/binding-plan";
import type { ProviderModule } from "@gooi/provider-runtime";

/**
 * Named conformance checks for provider-runtime behavior.
 */
export type ProviderConformanceCheckId =
	| "activation_succeeds"
	| "invalid_input_rejected"
	| "valid_input_succeeds"
	| "declared_effects_enforced";

export type ProviderConformanceCheckResult =
	ConformanceCheckResultBase<ProviderConformanceCheckId>;

/**
 * Conformance report for one provider module.
 */
export interface ProviderConformanceReport
	extends ConformanceSuiteReportBase<ProviderConformanceCheckResult> {
	/** Provider id under test. */
	readonly providerId: string;
	/** Host API version used during evaluation. */
	readonly hostApiVersion: string;
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
	readonly validInput: JsonValue;
	/** Invalid input expected to fail contract validation. */
	readonly invalidInput: JsonValue;
	/** Optional plan artifact for activation enforcement. */
	readonly bindingPlan?: BindingPlan;
	/** Optional lockfile artifact for activation enforcement. */
	readonly lockfile?: DeploymentLockfile;
}
