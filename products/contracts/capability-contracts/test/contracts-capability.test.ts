import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
	buildSchemaArtifact,
	defineCapabilityPort,
	hostProviderSchemaProfile,
} from "../src/capability-port/capability-port";
import {
	parseProviderManifest,
	safeParseProviderManifest,
} from "../src/provider-manifest/provider-manifest";

describe("capability-contracts", () => {
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

		expect(() =>
			buildSchemaArtifact(unrepresentable, hostProviderSchemaProfile),
		).toThrow();
	});

	test("pins defined capability contracts to the host/provider schema profile", () => {
		const contract = defineCapabilityPort({
			id: "ids.generate",
			version: "1.0.0",
			input: z.object({ count: z.number().int().positive() }),
			output: z.object({ ids: z.array(z.string()) }),
			error: z.object({ code: z.string(), message: z.string() }),
			declaredEffects: ["compute"] as const,
		});

		expect(contract.artifacts.input.target).toBe(hostProviderSchemaProfile);
		expect(contract.artifacts.output.target).toBe(hostProviderSchemaProfile);
		expect(contract.artifacts.error.target).toBe(hostProviderSchemaProfile);
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
					executionHosts: ["node"],
					delegationAllowedFrom: ["browser", "edge"],
				},
			],
		});

		expect(parsed.providerId).toBe("gooi.providers.memory");
		expect(parsed.capabilities[0]?.executionHosts).toEqual(["node"]);
	});

	test("rejects invalid provider capability execution host metadata", () => {
		expect(() =>
			parseProviderManifest({
				providerId: "gooi.providers.memory",
				providerVersion: "1.2.3",
				hostApiRange: "^1.0.0",
				capabilities: [
					{
						portId: "ids.generate",
						portVersion: "1.0.0",
						contractHash:
							"0f8f7ea8a9d837f76f16fdb5bf8f95d727ec4fdd6d8f45f0c6bf3d9c7d17d2cf",
						executionHosts: ["mobile"],
					},
				],
			}),
		).toThrow();
	});

	test("safe-parse returns typed issues for invalid manifests", () => {
		const parsed = safeParseProviderManifest({
			providerId: "gooi.providers.memory",
			providerVersion: "1.2.3",
			hostApiRange: "^1.0.0",
			capabilities: [
				{
					portId: "ids.generate",
					portVersion: "1.0.0",
					contractHash:
						"0f8f7ea8a9d837f76f16fdb5bf8f95d727ec4fdd6d8f45f0c6bf3d9c7d17d2cf",
					executionHosts: ["mobile"],
				},
			],
		});

		expect(parsed.success).toBe(false);
		if (!parsed.success) {
			expect(parsed.error.issues).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						path: expect.any(Array),
						message: expect.any(String),
					}),
				]),
			);
		}
	});

	test("parses provider manifests deterministically for identical input", () => {
		const input = {
			providerId: "gooi.providers.memory",
			providerVersion: "1.2.3",
			hostApiRange: "^1.0.0",
			capabilities: [
				{
					portId: "ids.generate",
					portVersion: "1.0.0",
					contractHash:
						"0f8f7ea8a9d837f76f16fdb5bf8f95d727ec4fdd6d8f45f0c6bf3d9c7d17d2cf",
					executionHosts: ["node"],
				},
			],
		};

		const first = parseProviderManifest(input);
		const second = parseProviderManifest(input);

		expect(first).toStrictEqual(second);
		expect(JSON.stringify(first)).toBe(JSON.stringify(second));
	});

	test("rejects provider and capability versions outside semver", () => {
		const parsed = safeParseProviderManifest({
			providerId: "gooi.providers.memory",
			providerVersion: "1.2",
			hostApiRange: "^1.0.0",
			capabilities: [
				{
					portId: "ids.generate",
					portVersion: "1",
					contractHash:
						"0f8f7ea8a9d837f76f16fdb5bf8f95d727ec4fdd6d8f45f0c6bf3d9c7d17d2cf",
					executionHosts: ["node"],
				},
			],
		});

		expect(parsed.success).toBe(false);
		if (!parsed.success) {
			expect(parsed.error.issues).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						path: expect.any(Array),
						message: expect.stringContaining("Expected semver"),
					}),
				]),
			);
		}
	});
});
