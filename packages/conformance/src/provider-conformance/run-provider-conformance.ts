import {
	activateProvider,
	deactivateProvider,
	invokeCapability,
} from "@gooi/provider-runtime";
import type {
	ProviderConformanceCheckId,
	ProviderConformanceCheckResult,
	ProviderConformanceReport,
	RunProviderConformanceInput,
} from "./contracts";

const buildCheck = (
	id: ProviderConformanceCheckId,
	passed: boolean,
	detail: string,
): ProviderConformanceCheckResult => ({
	id,
	passed,
	detail,
});

/**
 * Runs the provider conformance suite.
 *
 * @param input - Provider conformance input.
 * @returns Provider conformance report with named checks.
 *
 * @example
 * const report = await runProviderConformance(input);
 */
export const runProviderConformance = async (
	input: RunProviderConformanceInput,
): Promise<ProviderConformanceReport> => {
	const checks: ProviderConformanceCheckResult[] = [];
	const activated = await activateProvider({
		providerModule: input.providerModule,
		hostApiVersion: input.hostApiVersion,
		contracts: [input.contract],
		...(input.bindingPlan ? { bindingPlan: input.bindingPlan } : {}),
		...(input.lockfile ? { lockfile: input.lockfile } : {}),
	});

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
		principal: { subject: "conformance-user", roles: ["authenticated"] },
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
		principal: { subject: "conformance-user", roles: ["authenticated"] },
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
