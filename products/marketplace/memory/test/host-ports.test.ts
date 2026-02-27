import { describe, expect, test } from "bun:test";
import {
	createMemoryActivationPolicyPort,
	memoryActivationPolicyProvider,
} from "@gooi-marketplace/memory/activation-policy";
import {
	createMemoryClockPort,
	memoryClockProvider,
} from "@gooi-marketplace/memory/clock";
import {
	createMemoryCapabilityDelegationPort,
	memoryCapabilityDelegationProvider,
} from "@gooi-marketplace/memory/delegation";
import {
	createMemoryIdentityPort,
	memoryIdentityProvider,
} from "@gooi-marketplace/memory/identity";
import {
	createMemoryModuleIntegrityPort,
	memoryModuleIntegrityProvider,
} from "@gooi-marketplace/memory/module-integrity";
import {
	createMemoryModuleLoaderPort,
	memoryModuleLoaderProvider,
} from "@gooi-marketplace/memory/module-loader";
import {
	createMemoryPrincipalPort,
	memoryPrincipalProvider,
} from "@gooi-marketplace/memory/principal";

describe("marketplace-memory host ports", () => {
	test("creates deterministic clock and identity ports", () => {
		const clock = createMemoryClockPort({
			startAtIso: "2026-02-26T00:00:00.000Z",
			stepMs: 1000,
		});
		const identity = createMemoryIdentityPort({
			tracePrefix: "trace_",
			invocationPrefix: "inv_",
		});

		expect(clock.nowIso()).toBe("2026-02-26T00:00:00.000Z");
		expect(clock.nowIso()).toBe("2026-02-26T00:00:01.000Z");
		expect(identity.newTraceId()).toBe("trace_1");
		expect(identity.newInvocationId()).toBe("inv_1");
	});

	test("creates principal port with validation and role derivation", () => {
		const principal = createMemoryPrincipalPort();
		const validated = principal.validatePrincipal({
			subject: "user_1",
			claims: {},
			tags: ["admin"],
		});

		expect(validated.ok).toBe(true);
		if (!validated.ok) {
			return;
		}
		const roles = principal.deriveRoles({
			principal: validated.value,
			accessPlan: {},
		});
		expect(roles.ok).toBe(true);
		if (!roles.ok) {
			return;
		}
		expect(roles.value).toEqual(["admin", "authenticated"]);
	});

	test("creates activation policy and module loader ports", async () => {
		const activationPolicy = createMemoryActivationPolicyPort();
		expect(
			activationPolicy.assertHostVersionAligned({
				runtimeHostApiVersion: "1.0.0",
				bindingPlanHostApiVersion: "1.0.0",
				lockfileHostApiVersion: "1.0.0",
			}).ok,
		).toBe(true);
		expect(
			activationPolicy.assertHostVersionAligned({
				runtimeHostApiVersion: "2.0.0",
				bindingPlanHostApiVersion: "1.0.0",
				lockfileHostApiVersion: "1.0.0",
			}).ok,
		).toBe(false);

		const loader = createMemoryModuleLoaderPort({
			modules: {
				"module:one": { value: 1 },
			},
			fallback: async (specifier) => ({ value: specifier.length }),
		});
		await expect(loader.loadModule("module:one")).resolves.toEqual({
			value: 1,
		});
		await expect(loader.loadModule("module:missing")).resolves.toEqual({
			value: 14,
		});
	});

	test("creates module integrity and delegation ports", async () => {
		const integrity = createMemoryModuleIntegrityPort({
			acceptedIntegrity: ["sha256:ok"],
		});
		const accepted = await integrity.assertModuleIntegrity({
			providerId: "gooi.marketplace.memory",
			providerVersion: "1.0.0",
			integrity: "sha256:ok",
		});
		const rejected = await integrity.assertModuleIntegrity({
			providerId: "gooi.marketplace.memory",
			providerVersion: "1.0.0",
			integrity: "sha256:not-ok",
		});
		expect(accepted.ok).toBe(true);
		expect(rejected.ok).toBe(false);

		const delegation = createMemoryCapabilityDelegationPort({
			routes: {
				"route-node-1": async () => ({
					ok: true,
					output: { ids: ["delegated_1"] },
					observedEffects: ["compute"],
				}),
			},
		});
		const delegated = await delegation.invokeDelegated({
			routeId: "route-node-1",
			traceId: "trace_1",
			invocationId: "inv_1",
			capabilityCall: {
				portId: "ids.generate",
				portVersion: "1.0.0",
				input: { count: 1 },
				principal: { subject: "user_1", roles: ["authenticated"] },
				ctx: {
					id: "ctx_1",
					traceId: "trace_1",
					now: "2026-02-27T00:00:00.000Z",
				},
			},
		});
		const missingRoute = await delegation.invokeDelegated({
			routeId: "route-missing",
			traceId: "trace_2",
			invocationId: "inv_2",
			capabilityCall: {
				portId: "ids.generate",
				portVersion: "1.0.0",
				input: { count: 1 },
				principal: { subject: "user_1", roles: ["authenticated"] },
				ctx: {
					id: "ctx_2",
					traceId: "trace_2",
					now: "2026-02-27T00:00:01.000Z",
				},
			},
		});
		expect(delegated.ok).toBe(true);
		expect(missingRoute.ok).toBe(false);
	});

	test("publishes stable provider manifests for all host-port features", () => {
		expect(memoryClockProvider.manifest.contract.id).toBe("gooi.host.clock");
		expect(memoryIdentityProvider.manifest.contract.id).toBe(
			"gooi.host.identity",
		);
		expect(memoryPrincipalProvider.manifest.contract.id).toBe(
			"gooi.host.principal",
		);
		expect(memoryActivationPolicyProvider.manifest.contract.id).toBe(
			"gooi.host.activation-policy",
		);
		expect(memoryModuleLoaderProvider.manifest.contract.id).toBe(
			"gooi.host.module-loader",
		);
		expect(memoryModuleIntegrityProvider.manifest.contract.id).toBe(
			"gooi.host.module-integrity",
		);
		expect(memoryCapabilityDelegationProvider.manifest.contract.id).toBe(
			"gooi.host.capability-delegation",
		);
	});
});
