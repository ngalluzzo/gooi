import type { BindingPlan, DeploymentLockfile } from "@gooi/binding-plan";
import { executeEntrypoint } from "@gooi/entrypoint-runtime";
import { createDefaultEntrypointHostPorts } from "@gooi/entrypoint-runtime/host-ports";
import { hostFail, hostOk } from "@gooi/host-contracts";
import {
	activateProvider,
	deactivateProvider,
	type ProviderModule,
} from "@gooi/provider-runtime";
import type { ProviderRuntimeHostPorts } from "@gooi/provider-runtime/host-ports";
import type {
	HostConformanceCheckId,
	HostConformanceCheckResult,
	HostConformanceReport,
	RunHostConformanceInput,
} from "./contracts";

const buildCheck = (
	id: HostConformanceCheckId,
	passed: boolean,
	detail: string,
): HostConformanceCheckResult => ({ id, passed, detail });

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
			providerId,
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
			integrity: "sha256:host-conformance",
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
	const checks: HostConformanceCheckResult[] = [];

	const entrypointClockValues = [
		"2026-02-26T00:00:00.000Z",
		"2026-02-26T00:00:01.000Z",
	];
	let entrypointClockIndex = 0;
	const entrypointHostPorts = {
		...createDefaultEntrypointHostPorts(),
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

	const queryResult = await executeEntrypoint({
		bundle: input.bundle,
		binding: input.queryBinding,
		request: input.queryRequest,
		principal: input.principal,
		domainRuntime: input.domainRuntime,
		hostPorts: entrypointHostPorts,
	});

	checks.push(
		buildCheck(
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
		buildCheck(
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
	};

	const providerActivation = await activateProvider({
		providerModule,
		hostApiVersion: input.providerHostApiVersion,
		contracts: [input.providerContract],
		hostPorts: providerHostPorts,
	});

	checks.push(
		buildCheck(
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
		await deactivateProvider(providerActivation.value);
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

	const rejectingPolicyActivation = await activateProvider({
		providerModule,
		hostApiVersion: input.providerHostApiVersion,
		contracts: [input.providerContract],
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
		},
	});

	checks.push(
		buildCheck(
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
		passed: checks.every((check) => check.passed),
		checks,
	};
};
