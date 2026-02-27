import type { BindingPlan } from "@gooi/binding/binding-plan/contracts";
import type { DeploymentLockfile } from "@gooi/binding/lockfile/contracts";
import { defineCapabilityPort } from "@gooi/capability-contracts/capability-port";
import { hostOk } from "@gooi/host-contracts/result";
import type {
	ProviderModule,
	ProviderRuntimeHostPorts,
} from "@gooi/provider-runtime";
import { z } from "zod";
import type { RunReachabilityParitySuiteInput } from "../../src/reachability-parity/contracts";

const appId = "reachability-parity-app";
const environment = "test";
const providerId = "gooi.providers.reachability";
const providerVersion = "1.0.0";
const hostApiVersion = "1.0.0";
const providerSpecifier = "conformance/reachability-provider";

const contract = defineCapabilityPort({
	id: "ids.generate",
	version: "1.0.0",
	input: z.object({ count: z.number().int().positive() }),
	output: z.object({ ids: z.array(z.string()) }),
	error: z.object({ code: z.string(), message: z.string() }),
	declaredEffects: ["compute"],
});

const providerModule: ProviderModule = {
	manifest: {
		providerId,
		providerVersion,
		hostApiRange: "^1.0.0",
		capabilities: [
			{
				portId: contract.id,
				portVersion: contract.version,
				contractHash: contract.artifacts.contractHash,
				executionHosts: ["node"],
			},
		],
	},
	activate: async () => ({
		invoke: async (call) => {
			const parsed = contract.schemas.input.parse(call.input) as {
				count: number;
			};
			return {
				ok: true,
				output: {
					ids: Array.from({ length: parsed.count }).map(
						(_, index) => `id_${index + 1}`,
					),
				},
				observedEffects: ["compute"] as const,
			};
		},
		deactivate: async () => undefined,
	}),
};

const buildLockfile = (): DeploymentLockfile => ({
	appId,
	environment,
	hostApiVersion,
	providers: [
		{
			providerId,
			providerVersion,
			integrity:
				"sha256:fb0e8c460935d98d0e4045afe65c123ec9de42fb0a5d2d3f7ac7a7491229f00a",
			capabilities: [
				{
					portId: contract.id,
					portVersion: contract.version,
					contractHash: contract.artifacts.contractHash,
				},
			],
		},
	],
});

const localBindingPlan: BindingPlan = {
	appId,
	environment,
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
};

const delegatedBindingPlan: BindingPlan = {
	appId,
	environment,
	hostApiVersion,
	capabilityBindings: [
		{
			portId: contract.id,
			portVersion: contract.version,
			resolution: {
				mode: "delegated",
				targetHost: "node",
				providerId,
				delegateRouteId: "route-node-1",
			},
		},
	],
};

const createDelegatedHostPorts = (
	mode: "parity" | "mismatch",
): ProviderRuntimeHostPorts => ({
	clock: { nowIso: () => "2026-02-27T00:00:00.000Z" },
	activationPolicy: {
		assertHostVersionAligned: () => hostOk(undefined),
	},
	capabilityDelegation: {
		invokeDelegated: async (input) => {
			const parsed = contract.schemas.input.parse(
				input.capabilityCall.input,
			) as { count: number };
			return hostOk({
				ok: true,
				output:
					mode === "parity"
						? {
								ids: Array.from({ length: parsed.count }).map(
									(_, index) => `id_${index + 1}`,
								),
							}
						: {
								ids: [`mismatch_${parsed.count}`],
							},
				observedEffects: ["compute"],
			});
		},
	},
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
});

/**
 * Builds a passing local/delegated reachability parity fixture.
 */
export const createReachabilityParityFixture =
	(): RunReachabilityParitySuiteInput => ({
		providerModule,
		hostApiVersion,
		contract,
		input: { count: 2 },
		localBindingPlan,
		localLockfile: buildLockfile(),
		delegatedBindingPlan,
		delegatedLockfile: buildLockfile(),
		delegatedHostPorts: createDelegatedHostPorts("parity"),
		now: "2026-02-27T00:00:00.000Z",
	});

/**
 * Builds a failing fixture where delegated output diverges from local output.
 */
export const createReachabilityParityMismatchFixture =
	(): RunReachabilityParitySuiteInput => ({
		...createReachabilityParityFixture(),
		delegatedHostPorts: createDelegatedHostPorts("mismatch"),
	});
