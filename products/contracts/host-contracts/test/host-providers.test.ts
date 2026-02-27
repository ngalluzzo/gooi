import { describe, expect, test } from "bun:test";
import { hostOk } from "@gooi/host-contracts/result";
import {
	createHostActivationPolicyProvider,
	createStrictActivationPolicyPort,
} from "../src/activation-policy/activation-policy";
import {
	createHostClockProvider,
	createSystemClockPort,
} from "../src/clock/clock";
import {
	createFailingCapabilityDelegationPort,
	createHostCapabilityDelegationProvider,
} from "../src/delegation/delegation";
import {
	createHostIdentityProvider,
	createSystemIdentityPort,
} from "../src/identity/identity";
import {
	createHostModuleIntegrityProvider,
	createPermissiveModuleIntegrityPort,
} from "../src/module-integrity/module-integrity";
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

describe("host-contracts providers", () => {
	test("creates provider definitions for all host-port features", async () => {
		const identityProvider = createHostIdentityProvider({
			manifest: {
				providerId: "gooi.providers.identity",
				providerVersion: "1.0.0",
				hostApiRange: "^1.0.0",
			},
			createPort: createSystemIdentityPort,
		});
		const principalProvider = createHostPrincipalProvider({
			manifest: {
				providerId: "gooi.providers.principal",
				providerVersion: "1.0.0",
				hostApiRange: "^1.0.0",
			},
			createPort: () =>
				createHostPrincipalPort({
					validatePrincipal: (value) =>
						hostOk({
							subject: value === null ? null : "user_1",
							claims: {},
							tags: ["authenticated"],
						}),
				}),
		});
		const clockProvider = createHostClockProvider({
			manifest: {
				providerId: "gooi.providers.clock",
				providerVersion: "1.0.0",
				hostApiRange: "^1.0.0",
			},
			createPort: createSystemClockPort,
		});
		const moduleLoaderProvider = createHostModuleLoaderProvider({
			manifest: {
				providerId: "gooi.providers.module-loader",
				providerVersion: "1.0.0",
				hostApiRange: "^1.0.0",
			},
			createPort: createDynamicImportModuleLoaderPort,
		});
		const moduleIntegrityProvider = createHostModuleIntegrityProvider({
			manifest: {
				providerId: "gooi.providers.module-integrity",
				providerVersion: "1.0.0",
				hostApiRange: "^1.0.0",
			},
			createPort: createPermissiveModuleIntegrityPort,
		});
		const delegationProvider = createHostCapabilityDelegationProvider({
			manifest: {
				providerId: "gooi.providers.delegation",
				providerVersion: "1.0.0",
				hostApiRange: "^1.0.0",
			},
			createPort: createFailingCapabilityDelegationPort,
		});
		const activationPolicyProvider = createHostActivationPolicyProvider({
			manifest: {
				providerId: "gooi.providers.activation-policy",
				providerVersion: "1.0.0",
				hostApiRange: "^1.0.0",
			},
			createPort: createStrictActivationPolicyPort,
		});
		const replayStoreProvider = createHostReplayStoreProvider({
			manifest: {
				providerId: "gooi.providers.replay-store",
				providerVersion: "1.0.0",
				hostApiRange: "^1.0.0",
			},
			createPort: () =>
				createHostReplayStorePort({
					load: async () => null,
					save: async () => undefined,
				}),
		});

		const providers = [
			identityProvider,
			principalProvider,
			clockProvider,
			moduleLoaderProvider,
			moduleIntegrityProvider,
			delegationProvider,
			activationPolicyProvider,
			replayStoreProvider,
		];

		for (const provider of providers) {
			expect(typeof provider.createPort).toBe("function");
		}
		expect(clockProvider.manifest.contract.id).toBe("gooi.host.clock");
		expect(identityProvider.manifest.contract.id).toBe("gooi.host.identity");
		expect(principalProvider.manifest.contract.id).toBe("gooi.host.principal");
		expect(activationPolicyProvider.manifest.contract.id).toBe(
			"gooi.host.activation-policy",
		);
		expect(moduleLoaderProvider.manifest.contract.id).toBe(
			"gooi.host.module-loader",
		);
		expect(moduleIntegrityProvider.manifest.contract.id).toBe(
			"gooi.host.module-integrity",
		);
		expect(delegationProvider.manifest.contract.id).toBe(
			"gooi.host.capability-delegation",
		);
	});

	test("delegation provider surfaces hard-fail route errors by default", async () => {
		const delegation = createHostCapabilityDelegationProvider({
			manifest: {
				providerId: "gooi.providers.delegation",
				providerVersion: "1.0.0",
				hostApiRange: "^1.0.0",
			},
			createPort: createFailingCapabilityDelegationPort,
		}).createPort();

		const result = await delegation.invokeDelegated({
			routeId: "route-1",
			traceId: "trace-1",
			invocationId: "invocation-1",
			capabilityCall: {
				portId: "ids.generate",
				portVersion: "1.0.0",
				input: { count: 1 },
				principal: {
					subject: "user_1",
					roles: ["authenticated"],
				},
				ctx: {
					id: "ctx-1",
					traceId: "trace-1",
					now: "2026-02-26T00:00:00.000Z",
				},
			},
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("capability_delegation_error");
		}
	});
});
