import { defineCapabilityPort } from "@gooi/capability-contracts/capability-port";
import { hostFail, hostOk } from "@gooi/host-contracts/result";
import type { BindingPlan } from "@gooi/marketplace-contracts/binding-plan/contracts";
import type { DeploymentLockfile } from "@gooi/marketplace-contracts/lockfile/contracts";
import type { ExecutionHost } from "@gooi/marketplace-contracts/reachability/contracts";
import { z } from "zod";
import type {
	ProviderModule,
	ProviderRuntimeHostPorts,
} from "../../src/engine";

export const providerId = "gooi.providers.test";
export const providerVersion = "1.2.3";
export const appId = "hello-world-demo-v8";
export const environment = "dev";
export const hostApiVersion = "1.0.0";
export const providerSpecifier = "gooi.providers.test/module";

export const createContract = () =>
	defineCapabilityPort({
		id: "ids.generate",
		version: "1.0.0",
		input: z.object({ count: z.number().int().positive() }),
		output: z.object({ ids: z.array(z.string()) }),
		error: z.object({ code: z.string(), message: z.string() }),
		declaredEffects: ["compute"],
	});

export const createProviderModule = (
	contractHash: string,
	options?: {
		hostApiRange?: string;
		observedEffects?: readonly ["compute"] | readonly ["network"];
		invokeBehavior?: "normal" | "throw";
	},
): ProviderModule => ({
	manifest: {
		providerId,
		providerVersion,
		hostApiRange: options?.hostApiRange ?? "^1.0.0",
		capabilities: [
			{
				portId: "ids.generate",
				portVersion: "1.0.0",
				contractHash,
				executionHosts: ["node"],
			},
		],
	},
	activate: async () => ({
		invoke: async (call) => {
			if (options?.invokeBehavior === "throw") {
				throw new Error("Local invocation should not be used.");
			}
			return {
				ok: true,
				output: {
					ids: Array.from({
						length: Number((call.input as { count: number }).count),
					}).map((_, index) => `id_${index + 1}`),
				},
				observedEffects: options?.observedEffects ?? ["compute"],
			};
		},
		deactivate: async () => undefined,
	}),
});

export const createHostPorts = (
	providerModule: ProviderModule,
): ProviderRuntimeHostPorts => ({
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
		loadModule: async (specifier) => {
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

export const createBindingPlan = (
	resolution: BindingPlan["capabilityBindings"][number]["resolution"],
): BindingPlan => ({
	appId,
	environment,
	hostApiVersion,
	capabilityBindings: [
		{
			portId: "ids.generate",
			portVersion: "1.0.0",
			resolution,
		},
	],
});

export const createLocalResolution = (input?: {
	targetHost?: ExecutionHost;
	provider?: string;
}): BindingPlan["capabilityBindings"][number]["resolution"] => ({
	mode: "local",
	targetHost: input?.targetHost ?? "node",
	providerId: input?.provider ?? providerId,
});

export const createDelegatedResolution = (input?: {
	routeId?: string;
	targetHost?: ExecutionHost;
	provider?: string;
}): BindingPlan["capabilityBindings"][number]["resolution"] => ({
	mode: "delegated",
	targetHost: input?.targetHost ?? "node",
	providerId: input?.provider ?? providerId,
	delegateRouteId: input?.routeId ?? "route-node-1",
});

export const createUnreachableResolution = (
	reason = "No compatible host route.",
): BindingPlan["capabilityBindings"][number]["resolution"] => ({
	mode: "unreachable",
	reason,
});

export const createLockfile = (
	contractHash: string,
	options?: { integrity?: string },
): DeploymentLockfile => ({
	appId,
	environment,
	hostApiVersion,
	providers: [
		{
			providerId,
			providerVersion,
			integrity:
				options?.integrity ??
				"sha256:6a6f9c2f84fcb56af6dcaaf7af66c74d4d2e7070f951e8fbcf48f7cb13f12777",
			capabilities: [
				{
					portId: "ids.generate",
					portVersion: "1.0.0",
					contractHash,
				},
			],
		},
	],
});
