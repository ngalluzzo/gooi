import { describe, expect, test } from "bun:test";
import { defineCapabilityPort } from "@gooi/contracts-capability";
import type { CapabilityCall, ProviderModule } from "@gooi/provider-runtime";
import { z } from "zod";
import { runProviderConformance } from "../src/index";

describe("conformance", () => {
	test("runs the minimal provider conformance suite", async () => {
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

		const report = await runProviderConformance({
			providerModule,
			hostApiVersion: "1.0.0",
			contract,
			validInput: { count: 2 },
			invalidInput: { count: 0 },
		});

		expect(report.passed).toBe(true);
		expect(report.checks.every((check) => check.passed)).toBe(true);
	});
});
