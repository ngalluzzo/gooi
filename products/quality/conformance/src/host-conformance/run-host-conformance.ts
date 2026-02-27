import type { BindingPlan } from "@gooi/binding/binding-plan/contracts";
import type { DeploymentLockfile } from "@gooi/binding/lockfile/contracts";
import {
	createDefaultHostPorts,
	createEntrypointRuntime,
} from "@gooi/entrypoint-runtime";
import { createFailingCapabilityDelegationPort } from "@gooi/host-contracts/delegation";
import { hostFail, hostOk } from "@gooi/host-contracts/result";
import {
	createProviderRuntime,
	type ProviderModule,
	type ProviderRuntimeHostPorts,
} from "@gooi/provider-runtime";
import {
	areHostPortConformanceChecksPassing,
	buildHostPortConformanceCheck,
} from "../host-port-conformance/host-port-conformance";
import type {
	HostConformanceReport,
	RunHostConformanceInput,
} from "./contracts";

const buildBindingPlan = (
	hostApiVersion: string,
	providerId: string,
	contract: {
		readonly id: string;
		readonly version: string;
	},
): BindingPlan => ({
	appId: "host-conformance-app",
	environment: "test",
	hostApiVersion,
	capabilityBindings: [
		{
			portId: contract.id,
			portVersion: contract.version,
			resolution: {
				mode: "local",
				targetHost: "node",
				providerId,
			},
		},
	],
});

const buildLockfile = (
	hostApiVersion: string,
	providerId: string,
	providerVersion: string,
	contract: {
		readonly id: string;
		readonly version: string;
		readonly hash: string;
	},
): DeploymentLockfile => ({
	appId: "host-conformance-app",
	environment: "test",
	hostApiVersion,
	providers: [
		{
			providerId,
			providerVersion,
			integrity:
				"sha256:d1faebed8f7fd8f3f1c8f4a3bfe44ad6f656f4e4ec4df13db0adfbb6e2d70289",
			capabilities: [
				{
					portId: contract.id,
					portVersion: contract.version,
					contractHash: contract.hash,
				},
			],
		},
	],
});

/**
 * Runs host conformance checks for runtime orchestration behavior.
 *
 * @param input - Host conformance input.
 * @returns Host conformance report with named checks.
 */
export const runHostConformance = async (
	input: RunHostConformanceInput,
): Promise<HostConformanceReport> => {
	const checks: Array<HostConformanceReport["checks"][number]> = [];

	const entrypointClockValues = [
		"2026-02-26T00:00:00.000Z",
		"2026-02-26T00:00:01.000Z",
	];
	let entrypointClockIndex = 0;
	const entrypointHostPorts = {
		...createDefaultHostPorts(),
		clock: {
			nowIso: () => {
				const value =
					entrypointClockValues[entrypointClockIndex] ??
					entrypointClockValues[entrypointClockValues.length - 1];
				entrypointClockIndex += 1;
				return value ?? "2026-02-26T00:00:01.000Z";
			},
		},
		identity: {
			newTraceId: () => "trace_host_conformance",
			newInvocationId: () => "inv_host_conformance",
		},
	};
	const entrypointRuntime = createEntrypointRuntime({
		bundle: input.bundle,
		domainRuntime: input.domainRuntime,
		hostPorts: entrypointHostPorts,
	});

	const queryResult = await entrypointRuntime.run({
		binding: input.queryBinding,
		request: input.queryRequest,
		principal: input.principal,
	});

	checks.push(
		buildHostPortConformanceCheck(
			"entrypoint_host_identity_used",
			queryResult.traceId === "trace_host_conformance" &&
				queryResult.invocationId === "inv_host_conformance",
			queryResult.traceId === "trace_host_conformance" &&
				queryResult.invocationId === "inv_host_conformance"
				? "Entrypoint runtime used host-provided trace and invocation identities."
				: "Entrypoint runtime did not use host-provided identities.",
		),
	);

	checks.push(
		buildHostPortConformanceCheck(
			"entrypoint_host_clock_used",
			queryResult.timings.startedAt === "2026-02-26T00:00:00.000Z" &&
				queryResult.timings.completedAt === "2026-02-26T00:00:01.000Z",
			queryResult.timings.startedAt === "2026-02-26T00:00:00.000Z" &&
				queryResult.timings.completedAt === "2026-02-26T00:00:01.000Z"
				? "Entrypoint runtime used host-provided clock values."
				: "Entrypoint runtime did not use host-provided clock values.",
		),
	);

	const providerId = "gooi.providers.host.conformance";
	const providerVersion = "1.0.0";
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
	};
	const providerRuntime = createProviderRuntime({
		hostApiVersion: input.providerHostApiVersion,
		contracts: [input.providerContract],
		hostPorts: providerHostPorts,
	});

	const providerActivation = await providerRuntime.activate({
		providerModule,
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
		providerModule,
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

	return {
		passed: areHostPortConformanceChecksPassing(checks),
		checks,
	};
};
