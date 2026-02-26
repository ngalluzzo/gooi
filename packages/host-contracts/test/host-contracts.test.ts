import { describe, expect, test } from "bun:test";
import {
	createHostActivationPolicyProvider,
	createStrictActivationPolicyPort,
} from "../src/activation-policy/activation-policy";
import {
	createHostClockProvider,
	createSystemClockPort,
} from "../src/clock/clock";
import {
	createHostIdentityProvider,
	createSystemIdentityPort,
} from "../src/identity/identity";
import {
	createDynamicImportModuleLoaderPort,
	createHostModuleLoaderProvider,
} from "../src/module-loader/module-loader";
import {
	createHostPrincipalPort,
	createHostPrincipalProvider,
} from "../src/principal/principal";
import {
	createHostReplayStorePort,
	createHostReplayStoreProvider,
} from "../src/replay/replay";
import { hostFail, hostOk } from "../src/result/result";

describe("host-contracts", () => {
	test("creates ok and error host port envelopes", () => {
		const ok = hostOk({ value: 1 });
		const fail = hostFail("bad_request", "Invalid input", { field: "id" });

		expect(ok.ok).toBe(true);
		expect(fail.ok).toBe(false);
		if (!fail.ok) {
			expect(fail.error.code).toBe("bad_request");
		}
	});

	test("validates host API alignment strictly", () => {
		const policy = createStrictActivationPolicyPort();
		const aligned = policy.assertHostVersionAligned({
			runtimeHostApiVersion: "1.0.0",
			bindingPlanHostApiVersion: "1.0.0",
			lockfileHostApiVersion: "1.0.0",
		});
		const misaligned = policy.assertHostVersionAligned({
			runtimeHostApiVersion: "2.0.0",
			bindingPlanHostApiVersion: "1.0.0",
			lockfileHostApiVersion: "1.0.0",
		});

		expect(aligned.ok).toBe(true);
		expect(misaligned.ok).toBe(false);
		if (!misaligned.ok) {
			expect(misaligned.error.code).toBe("artifact_alignment_error");
		}
	});

	test("creates system ports", () => {
		const clock = createSystemClockPort();
		const identity = createSystemIdentityPort({
			tracePrefix: "trace_",
			invocationPrefix: "inv_",
		});

		expect(typeof clock.nowIso()).toBe("string");
		expect(identity.newTraceId().startsWith("trace_")).toBe(true);
		expect(identity.newInvocationId().startsWith("inv_")).toBe(true);
	});

	test("creates principal and replay ports", async () => {
		const principal = createHostPrincipalPort({
			validatePrincipal: (value) =>
				hostOk({
					subject: value === null ? null : "user_1",
					claims: {},
					tags: [],
				}),
			deriveRoles: () => hostOk(["authenticated"]),
		});
		const records = new Map<
			string,
			{ readonly inputHash: string; readonly result: { readonly ok: boolean } }
		>();
		const replay = createHostReplayStorePort<{ ok: boolean }>({
			load: async (scopeKey) => records.get(scopeKey) ?? null,
			save: async ({ scopeKey, record }) => {
				records.set(scopeKey, record);
			},
		});

		const validated = principal.validatePrincipal({});
		expect(validated.ok).toBe(true);

		await replay.save({
			scopeKey: "scope_1",
			record: { inputHash: "hash_1", result: { ok: true } },
			ttlSeconds: 60,
		});
		const loaded = await replay.load("scope_1");
		expect(loaded).not.toBeNull();
		expect(loaded?.result.ok).toBe(true);
	});

	test("creates replay-store provider definitions", () => {
		const provider = createHostReplayStoreProvider({
			manifest: {
				providerId: "gooi.providers.memory",
				providerVersion: "1.0.0",
				hostApiRange: "^1.0.0",
			},
			createPort: () =>
				createHostReplayStorePort({
					load: async () => null,
					save: async () => undefined,
				}),
		});

		expect(provider.manifest.contract.id).toBe("gooi.host.replay-store");
		expect(typeof provider.createPort).toBe("function");
	});

	test("creates provider definitions for all host-port features", () => {
		const clockProvider = createHostClockProvider({
			manifest: {
				providerId: "gooi.providers.memory",
				providerVersion: "1.0.0",
				hostApiRange: "^1.0.0",
			},
			createPort: createSystemClockPort,
		});
		const identityProvider = createHostIdentityProvider({
			manifest: {
				providerId: "gooi.providers.memory",
				providerVersion: "1.0.0",
				hostApiRange: "^1.0.0",
			},
			createPort: createSystemIdentityPort,
		});
		const principalProvider = createHostPrincipalProvider({
			manifest: {
				providerId: "gooi.providers.memory",
				providerVersion: "1.0.0",
				hostApiRange: "^1.0.0",
			},
			createPort: () =>
				createHostPrincipalPort({
					validatePrincipal: () =>
						hostOk({
							subject: "user_1",
							claims: {},
							tags: ["authenticated"],
						}),
					deriveRoles: () => hostOk(["authenticated"]),
				}),
		});
		const activationPolicyProvider = createHostActivationPolicyProvider({
			manifest: {
				providerId: "gooi.providers.memory",
				providerVersion: "1.0.0",
				hostApiRange: "^1.0.0",
			},
			createPort: createStrictActivationPolicyPort,
		});
		const moduleLoaderProvider = createHostModuleLoaderProvider({
			manifest: {
				providerId: "gooi.providers.memory",
				providerVersion: "1.0.0",
				hostApiRange: "^1.0.0",
			},
			createPort: createDynamicImportModuleLoaderPort,
		});

		expect(clockProvider.manifest.contract.id).toBe("gooi.host.clock");
		expect(identityProvider.manifest.contract.id).toBe("gooi.host.identity");
		expect(principalProvider.manifest.contract.id).toBe("gooi.host.principal");
		expect(activationPolicyProvider.manifest.contract.id).toBe(
			"gooi.host.activation-policy",
		);
		expect(moduleLoaderProvider.manifest.contract.id).toBe(
			"gooi.host.module-loader",
		);
	});
});
