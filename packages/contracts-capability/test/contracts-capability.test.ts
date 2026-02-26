import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
	buildSchemaArtifact,
	defineCapabilityPort,
	parseProviderManifest,
} from "../src/index";

describe("contracts-capability", () => {
	test("defines stable capability contract hashes", () => {
		const definition = {
			id: "ids.generate",
			version: "1.0.0",
			input: z.object({ count: z.number().int().positive() }),
			output: z.object({ ids: z.array(z.string()) }),
			error: z.object({ code: z.string(), message: z.string() }),
			declaredEffects: ["compute"] as const,
		};

		const first = defineCapabilityPort(definition);
		const second = defineCapabilityPort(definition);

		expect(first.artifacts.contractHash).toBe(second.artifacts.contractHash);
		expect(first.artifacts.input.hash).toBe(second.artifacts.input.hash);
	});

	test("rejects unrepresentable boundary schemas", () => {
		const unrepresentable = z
			.string()
			.transform((value) => value.toUpperCase());

		expect(() => buildSchemaArtifact(unrepresentable, "draft-7")).toThrow();
	});

	test("validates provider manifests", () => {
		const parsed = parseProviderManifest({
			providerId: "gooi.providers.memory",
			providerVersion: "1.2.3",
			hostApiRange: "^1.0.0",
			capabilities: [
				{
					portId: "ids.generate",
					portVersion: "1.0.0",
					contractHash:
						"0f8f7ea8a9d837f76f16fdb5bf8f95d727ec4fdd6d8f45f0c6bf3d9c7d17d2cf",
				},
			],
		});

		expect(parsed.providerId).toBe("gooi.providers.memory");
	});
});
