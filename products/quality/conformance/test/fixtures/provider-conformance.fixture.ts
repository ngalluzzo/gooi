import { defineCapabilityPort } from "@gooi/capability-contracts/capability-port";
import type { CapabilityCall, ProviderModule } from "@gooi/provider-runtime";
import { z } from "zod";

/**
 * Builds provider conformance fixture input.
 */
export const createProviderConformanceFixture = () => {
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
			providerId: "gooi.providers.sample",
			providerVersion: "1.0.0",
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
			invoke: async (call: CapabilityCall) => {
				const parsed = z
					.object({ count: z.number().int().positive() })
					.parse(call.input);
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

	return {
		providerModule,
		hostApiVersion: "1.0.0",
		contract,
		validInput: { count: 2 },
		invalidInput: { count: 0 },
	};
};
