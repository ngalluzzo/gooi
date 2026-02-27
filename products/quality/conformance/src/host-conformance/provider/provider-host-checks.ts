import { createFailingCapabilityDelegationPort } from "@gooi/host-contracts/delegation";
import { hostFail, hostOk } from "@gooi/host-contracts/result";
import {
	createProviderRuntime,
	type ProviderModule,
	type ProviderRuntimeHostPorts,
} from "@gooi/provider-runtime";
import { buildHostPortConformanceCheck } from "../../host-port-conformance/host-port-conformance";
import type {
	HostConformanceCheckId,
	HostConformanceCheckResult,
	RunHostConformanceInput,
} from "../contracts";
import { hasMissingHostPortDiagnostic } from "../shared/host-port-missing";
import { buildBindingPlan, buildLockfile } from "./provider-artifacts";

interface InvalidProviderHostPortCase {
	readonly id: HostConformanceCheckId;
	readonly path: string;
	readonly hostPorts: unknown;
}

export const runProviderHostChecks = async (
	input: RunHostConformanceInput,
): Promise<readonly HostConformanceCheckResult[]> => {
	const checks: HostConformanceCheckResult[] = [];
	const providerId = "gooi.providers.host.conformance";
	const providerVersion = "1.0.0";
	const providerSpecifier = "conformance/host-provider";
	let capturedActivatedAt = "";

	const providerModule: ProviderModule = {
		manifest: {
			providerId,
			providerVersion,
			hostApiRange: "*",
			capabilities: [
				{
					portId: input.providerContract.id,
					portVersion: input.providerContract.version,
					contractHash: input.providerContract.artifacts.contractHash,
					executionHosts: ["node"],
				},
			],
		},
		activate: async (context) => {
			capturedActivatedAt = context.activatedAt;
			return {
				invoke: async () => ({
					ok: true,
					output: {},
					observedEffects: [...input.providerContract.declaredEffects],
				}),
				deactivate: async () => undefined,
			};
		},
	};

	const providerHostPorts: ProviderRuntimeHostPorts = {
		clock: { nowIso: () => "2026-02-26T02:00:00.000Z" },
		activationPolicy: {
			assertHostVersionAligned: () => hostOk(undefined),
		},
		capabilityDelegation: createFailingCapabilityDelegationPort(),
		moduleLoader: {
			loadModule: async (specifier: string) => {
				if (specifier !== providerSpecifier) {
					throw new Error(`Unknown provider module specifier: ${specifier}`);
				}
				return providerModule;
			},
		},
		moduleIntegrity: {
			assertModuleIntegrity: async () => hostOk(undefined),
		},
	};

	const providerRuntime = createProviderRuntime({
		hostApiVersion: input.providerHostApiVersion,
		contracts: [input.providerContract],
		hostPorts: providerHostPorts,
	});

	const providerActivation = await providerRuntime.activate({
		providerSpecifier,
	});

	checks.push(
		buildHostPortConformanceCheck(
			"provider_host_clock_used",
			providerActivation.ok &&
				capturedActivatedAt === "2026-02-26T02:00:00.000Z",
			providerActivation.ok &&
				capturedActivatedAt === "2026-02-26T02:00:00.000Z"
				? "Provider activation used host-provided activation timestamp."
				: "Provider activation did not use host-provided activation timestamp.",
		),
	);
	if (providerActivation.ok) {
		await providerRuntime.deactivate(providerActivation.value);
	}

	const alignedPlan = buildBindingPlan(
		input.providerHostApiVersion,
		providerId,
		input.providerContract,
	);
	const alignedLockfile = buildLockfile(
		input.providerHostApiVersion,
		providerId,
		providerVersion,
		{
			id: input.providerContract.id,
			version: input.providerContract.version,
			hash: input.providerContract.artifacts.contractHash,
		},
	);

	const rejectingPolicyActivation = await providerRuntime.activate({
		providerSpecifier,
		bindingPlan: alignedPlan,
		lockfile: alignedLockfile,
		hostPorts: {
			clock: providerHostPorts.clock,
			activationPolicy: {
				assertHostVersionAligned: () =>
					hostFail(
						"activation_policy_denied",
						"Activation policy denied alignment.",
					),
			},
			capabilityDelegation: providerHostPorts.capabilityDelegation,
			moduleLoader: providerHostPorts.moduleLoader,
			moduleIntegrity: providerHostPorts.moduleIntegrity,
		},
	});

	checks.push(
		buildHostPortConformanceCheck(
			"provider_activation_policy_used",
			!rejectingPolicyActivation.ok &&
				rejectingPolicyActivation.error.kind === "activation_error" &&
				rejectingPolicyActivation.error.message ===
					"Activation policy denied alignment.",
			!rejectingPolicyActivation.ok &&
				rejectingPolicyActivation.error.kind === "activation_error" &&
				rejectingPolicyActivation.error.message ===
					"Activation policy denied alignment."
				? "Provider activation consulted host activation policy."
				: "Provider activation did not consult host activation policy.",
		),
	);

	const activateProviderWithHostPorts = (hostPorts: unknown) =>
		createProviderRuntime({
			hostApiVersion: input.providerHostApiVersion,
			contracts: [input.providerContract],
			hostPorts: providerHostPorts,
		}).activate({
			providerSpecifier,
			hostPorts: hostPorts as never,
		});

	const invalidCases: readonly InvalidProviderHostPortCase[] = [
		{
			id: "provider_missing_clock_rejected",
			path: "clock.nowIso",
			hostPorts: {
				...providerHostPorts,
				clock: {},
			},
		},
		{
			id: "provider_missing_activation_policy_rejected",
			path: "activationPolicy.assertHostVersionAligned",
			hostPorts: {
				...providerHostPorts,
				activationPolicy: {},
			},
		},
		{
			id: "provider_missing_delegation_rejected",
			path: "capabilityDelegation.invokeDelegated",
			hostPorts: {
				...providerHostPorts,
				capabilityDelegation: {},
			},
		},
		{
			id: "provider_missing_module_loader_rejected",
			path: "moduleLoader.loadModule",
			hostPorts: {
				...providerHostPorts,
				moduleLoader: {},
			},
		},
		{
			id: "provider_missing_module_integrity_rejected",
			path: "moduleIntegrity.assertModuleIntegrity",
			hostPorts: {
				...providerHostPorts,
				moduleIntegrity: {},
			},
		},
	];

	for (const invalidCase of invalidCases) {
		const invalidActivation = await activateProviderWithHostPorts(
			invalidCase.hostPorts,
		);
		const passed =
			!invalidActivation.ok &&
			invalidActivation.error.kind === "activation_error" &&
			hasMissingHostPortDiagnostic(
				invalidActivation.error.details,
				invalidCase.path,
			);
		checks.push(
			buildHostPortConformanceCheck(
				invalidCase.id,
				passed,
				passed
					? `Provider runtime rejected missing host port member ${invalidCase.path}.`
					: `Provider runtime did not reject missing host port member ${invalidCase.path}.`,
			),
		);
	}

	return checks;
};
