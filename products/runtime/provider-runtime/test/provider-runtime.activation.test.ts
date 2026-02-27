import { describe, expect, test } from "bun:test";
import { hostFail, hostOk } from "@gooi/host-contracts/result";
import { activateProvider } from "../src/activation/activation";
import type { ProviderModule } from "../src/engine";
import {
	createBindingPlan,
	createContract,
	createLocalResolution,
	createLockfile,
	createProviderModule,
	createUnreachableResolution,
	hostApiVersion,
} from "./fixtures/provider-runtime.fixture";

describe("provider-runtime activation", () => {
	const createHostPorts = () => ({
		clock: { nowIso: () => "2026-02-27T00:00:00.000Z" },
		activationPolicy: {
			assertHostVersionAligned: () => hostOk(undefined),
		},
		capabilityDelegation: {
			invokeDelegated: async () =>
				hostFail("delegation_not_configured", "Delegation is not configured."),
		},
	});

	const createMissingHostPortCase = (
		path:
			| "clock.nowIso"
			| "activationPolicy.assertHostVersionAligned"
			| "capabilityDelegation.invokeDelegated",
	) => {
		const base = createHostPorts();
		switch (path) {
			case "clock.nowIso":
				return {
					...base,
					clock: {},
				};
			case "activationPolicy.assertHostVersionAligned":
				return {
					...base,
					activationPolicy: {},
				};
			case "capabilityDelegation.invokeDelegated":
				return {
					...base,
					capabilityDelegation: {},
				};
		}
	};

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
			providerModule,
			hostApiVersion,
			contracts: [contract],
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

	test("hard-fails activation for incompatible host API", async () => {
		const contract = createContract();
		const providerModule = createProviderModule(
			contract.artifacts.contractHash,
			{
				hostApiRange: "^2.0.0",
			},
		);

		const activated = await activateProvider({
			providerModule,
			hostApiVersion,
			contracts: [contract],
		});

		expect(activated.ok).toBe(false);
		if (!activated.ok) {
			expect(activated.error.kind).toBe("compatibility_error");
		}
	});

	test("fails activation deterministically when required provider host ports are missing", async () => {
		const contract = createContract();
		const providerModule = createProviderModule(
			contract.artifacts.contractHash,
		);
		const missingCases = [
			"clock.nowIso",
			"activationPolicy.assertHostVersionAligned",
			"capabilityDelegation.invokeDelegated",
		] as const;

		for (const missingPath of missingCases) {
			const activated = await activateProvider({
				providerModule,
				hostApiVersion,
				contracts: [contract],
				hostPorts: createMissingHostPortCase(missingPath) as never,
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
			providerModule,
			hostApiVersion,
			contracts: [mismatchedContract],
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

	test("enforces binding plan and lockfile capability hashes", async () => {
		const contract = createContract();
		const providerModule = createProviderModule(
			contract.artifacts.contractHash,
		);

		const activated = await activateProvider({
			providerModule,
			hostApiVersion,
			contracts: [contract],
			bindingPlan: createBindingPlan(createLocalResolution()),
			lockfile: createLockfile(contract.artifacts.contractHash),
		});

		expect(activated.ok).toBe(true);
	});

	test("fails activation with capability_unreachable_error for unreachable bindings", async () => {
		const contract = createContract();
		const providerModule = createProviderModule(
			contract.artifacts.contractHash,
		);

		const activated = await activateProvider({
			providerModule,
			hostApiVersion,
			contracts: [contract],
			bindingPlan: createBindingPlan(createUnreachableResolution()),
			lockfile: createLockfile(contract.artifacts.contractHash),
		});

		expect(activated.ok).toBe(false);
		if (!activated.ok) {
			expect(activated.error.kind).toBe("capability_unreachable_error");
		}
	});

	test("fails activation when binding targets a different provider", async () => {
		const contract = createContract();
		const providerModule = createProviderModule(
			contract.artifacts.contractHash,
		);

		const activated = await activateProvider({
			providerModule,
			hostApiVersion,
			contracts: [contract],
			bindingPlan: createBindingPlan(
				createLocalResolution({ provider: "gooi.providers.other" }),
			),
			lockfile: createLockfile(contract.artifacts.contractHash),
		});

		expect(activated.ok).toBe(false);
		if (!activated.ok) {
			expect(activated.error.kind).toBe("activation_error");
		}
	});

	test("fails activation when runtime host API version does not match binding artifacts", async () => {
		const contract = createContract();
		const providerModule = createProviderModule(
			contract.artifacts.contractHash,
			{
				hostApiRange: "*",
			},
		);

		const activated = await activateProvider({
			providerModule,
			hostApiVersion: "2.0.0",
			contracts: [contract],
			bindingPlan: createBindingPlan(createLocalResolution()),
			lockfile: createLockfile(contract.artifacts.contractHash),
		});

		expect(activated.ok).toBe(false);
		if (!activated.ok) {
			expect(activated.error.kind).toBe("activation_error");
		}
	});

	test("fails activation when lockfile integrity is not a valid sha256 checksum", async () => {
		const contract = createContract();
		const providerModule = createProviderModule(
			contract.artifacts.contractHash,
		);

		const activated = await activateProvider({
			providerModule,
			hostApiVersion,
			contracts: [contract],
			bindingPlan: createBindingPlan(createLocalResolution()),
			lockfile: createLockfile(contract.artifacts.contractHash, {
				integrity: "sha256:abc123",
			}),
		});

		expect(activated.ok).toBe(false);
		if (!activated.ok) {
			expect(activated.error.kind).toBe("activation_error");
			expect(activated.error.message).toBe(
				"Lockfile provider integrity is invalid; expected sha256 checksum format.",
			);
		}
	});
});
