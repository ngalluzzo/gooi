import { describe, expect, test } from "bun:test";
import {
	createMemoryActivationPolicyPort,
	memoryActivationPolicyProvider,
} from "../src/activation-policy/activation-policy";
import { createMemoryClockPort, memoryClockProvider } from "../src/clock/clock";
import {
	createMemoryIdentityPort,
	memoryIdentityProvider,
} from "../src/identity/identity";
import {
	createMemoryModuleLoaderPort,
	memoryModuleLoaderProvider,
} from "../src/module-loader/module-loader";
import {
	createMemoryPrincipalPort,
	memoryPrincipalProvider,
} from "../src/principal/principal";

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
	});
});
