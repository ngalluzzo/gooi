import { describe, expect, test } from "bun:test";
import { defineCapabilityPort } from "@gooi/capability-contracts/capability-port";
import { z } from "zod";
import { activateProvider } from "../src/activation/activation";
import type { ProviderModule } from "../src/engine";
import { invokeCapability } from "../src/invocation/invocation";

const createContract = () =>
	defineCapabilityPort({
		id: "ids.generate",
		version: "1.0.0",
		input: z.object({ count: z.number().int().positive() }),
		output: z.object({ ids: z.array(z.string()) }),
		error: z.object({ code: z.string(), message: z.string() }),
		declaredEffects: ["compute"],
	});

const createProviderModule = (
	contractHash: string,
	options?: {
		hostApiRange?: string;
		observedEffects?: readonly ["compute"] | readonly ["network"];
	},
): ProviderModule => ({
	manifest: {
		providerId: "gooi.providers.test",
		providerVersion: "1.2.3",
		hostApiRange: options?.hostApiRange ?? "^1.0.0",
		capabilities: [
			{
				portId: "ids.generate",
				portVersion: "1.0.0",
				contractHash,
			},
		],
	},
	activate: async () => ({
		invoke: async (call) => ({
			ok: true,
			output: {
				ids: Array.from({
					length: Number((call.input as { count: number }).count),
				}).map((_, index) => `id_${index + 1}`),
			},
			observedEffects: options?.observedEffects ?? ["compute"],
		}),
		deactivate: async () => undefined,
	}),
});

describe("provider-runtime", () => {
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
			hostApiVersion: "1.0.0",
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
			hostApiVersion: "1.0.0",
			contracts: [contract],
			bindingPlan: {
				appId: "hello-world-demo-v8",
				environment: "dev",
				hostApiVersion: "1.0.0",
				capabilityBindings: [
					{
						portId: "ids.generate",
						portVersion: "1.0.0",
						providerId: "gooi.providers.test",
					},
				],
			},
			lockfile: {
				appId: "hello-world-demo-v8",
				environment: "dev",
				hostApiVersion: "1.0.0",
				providers: [
					{
						providerId: "gooi.providers.test",
						providerVersion: "1.2.3",
						integrity: "sha256:abc123",
						capabilities: [
							{
								portId: "ids.generate",
								portVersion: "1.0.0",
								contractHash: contract.artifacts.contractHash,
							},
						],
					},
				],
			},
		});

		expect(activated.ok).toBe(true);
	});

	test("rejects undeclared observed effects at invocation time", async () => {
		const contract = createContract();
		const providerModule = createProviderModule(
			contract.artifacts.contractHash,
			{
				observedEffects: ["network"],
			},
		);

		const activated = await activateProvider({
			providerModule,
			hostApiVersion: "1.0.0",
			contracts: [contract],
		});

		expect(activated.ok).toBe(true);
		if (!activated.ok) {
			return;
		}

		const result = await invokeCapability(activated.value, {
			portId: "ids.generate",
			portVersion: "1.0.0",
			input: { count: 2 },
			principal: {
				subject: "user_1",
				roles: ["authenticated"],
			},
			ctx: {
				id: "invocation_1",
				traceId: "trace_1",
				now: new Date().toISOString(),
			},
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.kind).toBe("effect_violation_error");
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
			bindingPlan: {
				appId: "hello-world-demo-v8",
				environment: "dev",
				hostApiVersion: "1.0.0",
				capabilityBindings: [
					{
						portId: "ids.generate",
						portVersion: "1.0.0",
						providerId: "gooi.providers.test",
					},
				],
			},
			lockfile: {
				appId: "hello-world-demo-v8",
				environment: "dev",
				hostApiVersion: "1.0.0",
				providers: [
					{
						providerId: "gooi.providers.test",
						providerVersion: "1.2.3",
						integrity: "sha256:abc123",
						capabilities: [
							{
								portId: "ids.generate",
								portVersion: "1.0.0",
								contractHash: contract.artifacts.contractHash,
							},
						],
					},
				],
			},
		});

		expect(activated.ok).toBe(false);
		if (!activated.ok) {
			expect(activated.error.kind).toBe("activation_error");
		}
	});
});
