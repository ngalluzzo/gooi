import type { BindingPlan, DeploymentLockfile } from "@gooi/binding-plan";
import type { CapabilityPortContract } from "@gooi/contracts-capability";
import {
	activateProvider,
	deactivateProvider,
	invokeCapability,
	type ProviderModule,
} from "@gooi/provider-runtime";

/**
 * Named conformance checks for provider-runtime behavior.
 */
export type ConformanceCheckId =
	| "activation_succeeds"
	| "invalid_input_rejected"
	| "valid_input_succeeds"
	| "declared_effects_enforced";

/**
 * Result for one conformance check.
 */
export interface ConformanceCheckResult {
	/** Stable check identifier. */
	readonly id: ConformanceCheckId;
	/** True when the check passed. */
	readonly passed: boolean;
	/** Human-readable check detail. */
	readonly detail: string;
}

/**
 * Conformance report for one provider module.
 */
export interface ConformanceReport {
	/** Provider id under test. */
	readonly providerId: string;
	/** Host API version used during evaluation. */
	readonly hostApiVersion: string;
	/** Aggregate pass status. */
	readonly passed: boolean;
	/** Individual check outcomes. */
	readonly checks: readonly ConformanceCheckResult[];
}

/**
 * Input required for conformance checks.
 */
export interface RunConformanceInput {
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

const buildCheck = (
	id: ConformanceCheckId,
	passed: boolean,
	detail: string,
): ConformanceCheckResult => ({
	id,
	passed,
	detail,
});

/**
 * Runs the minimal RFC-0001 provider conformance suite.
 *
 * @param input - Conformance harness input.
 * @returns Conformance report with named checks.
 *
 * @example
 * const report = await runProviderConformance({
 *   providerModule,
 *   hostApiVersion: "1.0.0",
 *   contract,
 *   validInput: { count: 1 },
 *   invalidInput: { count: 0 },
 * });
 */
export const runProviderConformance = async (
	input: RunConformanceInput,
): Promise<ConformanceReport> => {
	const checks: ConformanceCheckResult[] = [];

	const activationInput = {
		providerModule: input.providerModule,
		hostApiVersion: input.hostApiVersion,
		contracts: [input.contract],
		...(input.bindingPlan ? { bindingPlan: input.bindingPlan } : {}),
		...(input.lockfile ? { lockfile: input.lockfile } : {}),
	};

	const activated = await activateProvider(activationInput);

	if (!activated.ok) {
		checks.push(
			buildCheck(
				"activation_succeeds",
				false,
				`Activation failed: ${activated.error.kind} - ${activated.error.message}`,
			),
		);

		return {
			providerId: "unknown",
			hostApiVersion: input.hostApiVersion,
			passed: false,
			checks,
		};
	}

	checks.push(buildCheck("activation_succeeds", true, "Activation succeeded."));

	const providerId = activated.value.manifest.providerId;

	const invalidInputResult = await invokeCapability(activated.value, {
		portId: input.contract.id,
		portVersion: input.contract.version,
		input: input.invalidInput,
		principal: {
			subject: "conformance-user",
			roles: ["authenticated"],
		},
		ctx: {
			id: "conformance-invalid",
			traceId: "trace-invalid",
			now: new Date().toISOString(),
		},
	});

	checks.push(
		buildCheck(
			"invalid_input_rejected",
			!invalidInputResult.ok &&
				invalidInputResult.error.kind === "validation_error",
			invalidInputResult.ok
				? "Invalid input unexpectedly succeeded."
				: `${invalidInputResult.error.kind}: ${invalidInputResult.error.message}`,
		),
	);

	const validInputResult = await invokeCapability(activated.value, {
		portId: input.contract.id,
		portVersion: input.contract.version,
		input: input.validInput,
		principal: {
			subject: "conformance-user",
			roles: ["authenticated"],
		},
		ctx: {
			id: "conformance-valid",
			traceId: "trace-valid",
			now: new Date().toISOString(),
		},
	});

	checks.push(
		buildCheck(
			"valid_input_succeeds",
			validInputResult.ok && validInputResult.value.ok,
			validInputResult.ok
				? validInputResult.value.ok
					? "Valid input succeeded with output payload."
					: "Valid input returned a typed error payload."
				: `${validInputResult.error.kind}: ${validInputResult.error.message}`,
		),
	);

	checks.push(
		buildCheck(
			"declared_effects_enforced",
			validInputResult.ok,
			validInputResult.ok
				? "No undeclared effects observed during valid invocation."
				: `${validInputResult.error.kind}: ${validInputResult.error.message}`,
		),
	);

	await deactivateProvider(activated.value);

	return {
		providerId,
		hostApiVersion: input.hostApiVersion,
		passed: checks.every((check) => check.passed),
		checks,
	};
};
