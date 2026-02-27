import { describe, expect, test } from "bun:test";
import { hostFail } from "@gooi/host-contracts/result";
import { activateProvider } from "../../src/activation/activation";
import type { ProviderModule } from "../../src/engine";
import {
	createBindingPlan,
	createContract,
	createHostPorts,
	createLocalResolution,
	createLockfile,
	createProviderModule,
	hostApiVersion,
	providerSpecifier,
} from "../fixtures/provider-runtime.fixture";
import { createMissingHostPortCase } from "./test-utils";

describe("provider-runtime activation validation", () => {
	test("fails activation with typed validation_error details for invalid provider manifests", async () => {
		const contract = createContract();
		const providerModule: ProviderModule = {
			manifest: {
				providerId: "",
				providerVersion: "invalid",
				hostApiRange: "^1.0.0",
				capabilities: [],
			},
			activate: async () => ({
				invoke: async () => ({
					ok: true,
					output: { ids: [] },
					observedEffects: ["compute"],
				}),
				deactivate: async () => undefined,
			}),
		};

		const activated = await activateProvider({
			providerSpecifier,
			hostApiVersion,
			contracts: [contract],
			hostPorts: createHostPorts(providerModule),
		});

		expect(activated.ok).toBe(false);
		if (!activated.ok) {
			expect(activated.error.kind).toBe("validation_error");
			expect(activated.error.details).toEqual(
				expect.objectContaining({
					issues: expect.arrayContaining([
						expect.objectContaining({
							path: expect.any(Array),
							message: expect.any(String),
						}),
					]),
				}),
			);
		}
	});

	test("fails activation with typed compatibility diagnostics for schema profile mismatch", async () => {
		const contract = createContract();
		const mismatchedContract = {
			...contract,
			artifacts: {
				...contract.artifacts,
				input: {
					...contract.artifacts.input,
					target: "draft-7" as const,
				},
			},
		};
		const providerModule = createProviderModule(
			contract.artifacts.contractHash,
		);

		const activated = await activateProvider({
			providerSpecifier,
			hostApiVersion,
			contracts: [mismatchedContract],
			hostPorts: createHostPorts(providerModule),
		});

		expect(activated.ok).toBe(false);
		if (!activated.ok) {
			expect(activated.error.kind).toBe("compatibility_error");
			expect(activated.error.details).toEqual(
				expect.objectContaining({
					code: "schema_profile_mismatch",
					expectedSchemaProfile: "draft-2020-12",
					actualSchemaProfile: "draft-7",
					boundary: "input",
				}),
			);
		}
	});

	test("enforces required host ports before attempting provider activation", async () => {
		const contract = createContract();
		const providerModule = createProviderModule(
			contract.artifacts.contractHash,
		);
		const missingCases = [
			"clock.nowIso",
			"activationPolicy.assertHostVersionAligned",
			"capabilityDelegation.invokeDelegated",
			"moduleLoader.loadModule",
			"moduleIntegrity.assertModuleIntegrity",
		] as const;

		for (const missingPath of missingCases) {
			const activated = await activateProvider({
				providerSpecifier,
				hostApiVersion,
				contracts: [contract],
				hostPorts: createMissingHostPortCase(
					providerModule,
					missingPath,
				) as never,
			});

			expect(activated.ok).toBe(false);
			if (!activated.ok) {
				expect(activated.error.kind).toBe("activation_error");
				expect(activated.error.details).toEqual(
					expect.objectContaining({
						code: "host_port_missing",
						missingHostPortMembers: expect.arrayContaining([
							expect.objectContaining({
								path: missingPath,
								expected: "function",
							}),
						]),
					}),
				);
			}
		}
	});

	test("fails activation when provider module loader cannot resolve the requested specifier", async () => {
		const contract = createContract();
		const providerModule = createProviderModule(
			contract.artifacts.contractHash,
		);

		const activated = await activateProvider({
			providerSpecifier: "gooi.providers.unknown/module",
			hostApiVersion,
			contracts: [contract],
			hostPorts: {
				...createHostPorts(providerModule),
				moduleLoader: {
					loadModule: async () => {
						throw new Error("Module not found.");
					},
				},
			},
		});

		expect(activated.ok).toBe(false);
		if (!activated.ok) {
			expect(activated.error.kind).toBe("activation_error");
			expect(activated.error.details).toEqual(
				expect.objectContaining({
					code: "module_load_failed",
					providerSpecifier: "gooi.providers.unknown/module",
				}),
			);
		}
	});

	test("fails activation when module integrity verification rejects lockfile metadata", async () => {
		const contract = createContract();
		const providerModule = createProviderModule(
			contract.artifacts.contractHash,
		);

		const activated = await activateProvider({
			providerSpecifier,
			hostApiVersion,
			contracts: [contract],
			bindingPlan: createBindingPlan(createLocalResolution()),
			lockfile: createLockfile(contract.artifacts.contractHash),
			hostPorts: {
				...createHostPorts(providerModule),
				moduleIntegrity: {
					assertModuleIntegrity: async () =>
						hostFail(
							"module_integrity_failed",
							"Module integrity verification failed.",
						),
				},
			},
		});

		expect(activated.ok).toBe(false);
		if (!activated.ok) {
			expect(activated.error.kind).toBe("activation_error");
			expect(activated.error.message).toBe(
				"Module integrity verification failed.",
			);
		}
	});
});
