import { describe, expect, test } from "bun:test";
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
});
