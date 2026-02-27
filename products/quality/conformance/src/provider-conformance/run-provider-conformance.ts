import { hostFail, hostOk } from "@gooi/host-contracts/result";
import { createProviderRuntime } from "@gooi/provider-runtime";
import {
	areHostPortConformanceChecksPassing,
	buildHostPortConformanceCheck,
} from "../host-port-conformance/host-port-conformance";
import type {
	ProviderConformanceReport,
	RunProviderConformanceInput,
} from "./contracts";

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
	const checks: Array<ProviderConformanceReport["checks"][number]> = [];
	const providerSpecifier = "conformance/provider-module";
	const hostPorts = {
		clock: {
			nowIso: () => "2026-02-27T00:00:00.000Z",
		},
		activationPolicy: {
			assertHostVersionAligned: () => hostOk(undefined),
		},
		capabilityDelegation: {
			invokeDelegated: async () =>
				hostFail("delegation_not_configured", "Delegation is not configured."),
		},
		moduleLoader: {
			loadModule: async (specifier: string) => {
				if (specifier !== providerSpecifier) {
					throw new Error(`Unknown provider module specifier: ${specifier}`);
				}
				return input.providerModule;
			},
		},
		moduleIntegrity: {
			assertModuleIntegrity: async () => hostOk(undefined),
		},
	};
	const runtime = createProviderRuntime({
		hostApiVersion: input.hostApiVersion,
		contracts: [input.contract],
		hostPorts,
		...(input.bindingPlan ? { bindingPlan: input.bindingPlan } : {}),
		...(input.lockfile ? { lockfile: input.lockfile } : {}),
	});
	const activated = await runtime.activate({
		providerSpecifier,
	});

	if (!activated.ok) {
		checks.push(
			buildHostPortConformanceCheck(
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

	checks.push(
		buildHostPortConformanceCheck(
			"activation_succeeds",
			true,
			"Activation succeeded.",
		),
	);
	const providerId = activated.value.manifest.providerId;
	const invalidInputResult = await runtime.invoke(activated.value, {
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
		buildHostPortConformanceCheck(
			"invalid_input_rejected",
			!invalidInputResult.ok &&
				invalidInputResult.error.kind === "validation_error",
			invalidInputResult.ok
				? "Invalid input unexpectedly succeeded."
				: `${invalidInputResult.error.kind}: ${invalidInputResult.error.message}`,
		),
	);

	const validInputResult = await runtime.invoke(activated.value, {
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
		buildHostPortConformanceCheck(
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
		buildHostPortConformanceCheck(
			"declared_effects_enforced",
			validInputResult.ok,
			validInputResult.ok
				? "No undeclared effects observed during valid invocation."
				: `${validInputResult.error.kind}: ${validInputResult.error.message}`,
		),
	);
	await runtime.deactivate(activated.value);
	return {
		providerId,
		hostApiVersion: input.hostApiVersion,
		passed: areHostPortConformanceChecksPassing(checks),
		checks,
	};
};
