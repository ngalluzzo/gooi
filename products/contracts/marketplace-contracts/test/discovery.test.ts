import { describe, expect, test } from "bun:test";
import { discoveryContracts } from "../src/discovery/contracts";

const lockfileFixture = {
	appId: "chat-assistant",
	environment: "dev",
	hostApiVersion: "1.0.0",
	providers: [
		{
			providerId: "gooi.providers.memory",
			providerVersion: "1.2.3",
			integrity:
				"sha256:6a6f9c2f84fcb56af6dcaaf7af66c74d4d2e7070f951e8fbcf48f7cb13f12777",
			capabilities: [
				{
					portId: "notifications.send",
					portVersion: "1.0.0",
					contractHash:
						"0f8f7ea8a9d837f76f16fdb5bf8f95d727ec4fdd6d8f45f0c6bf3d9c7d17d2cf",
				},
			],
		},
		{
			providerId: "gooi.providers.http",
			providerVersion: "2.0.0",
			integrity:
				"sha256:fb0e8c460935d98d0e4045afe65c123ec9de42fb0a5d2d3f7ac7a7491229f00a",
			capabilities: [
				{
					portId: "notifications.send",
					portVersion: "1.0.0",
					contractHash:
						"1111111111111111111111111111111111111111111111111111111111111111",
				},
			],
		},
	],
};

describe("discovery", () => {
	test("returns compatibility and trust metadata for discovered providers", () => {
		const result = discoveryContracts.discoverProviders({
			lockfile: lockfileFixture,
			query: {
				portId: "notifications.send",
				portVersion: "1.0.0",
				contractHash:
					"0f8f7ea8a9d837f76f16fdb5bf8f95d727ec4fdd6d8f45f0c6bf3d9c7d17d2cf",
				minTrustTier: "review",
			},
			trustIndex: {
				"gooi.providers.memory@1.2.3": {
					tier: "trusted",
					certifications: ["soc2", "iso27001"],
				},
				"gooi.providers.http@2.0.0": {
					tier: "review",
					certifications: ["self-attested"],
				},
			},
		});

		expect(result.providers).toHaveLength(2);
		expect(result.providers[0]).toEqual({
			providerId: "gooi.providers.memory",
			providerVersion: "1.2.3",
			integrity:
				"sha256:6a6f9c2f84fcb56af6dcaaf7af66c74d4d2e7070f951e8fbcf48f7cb13f12777",
			compatibility: {
				requiredHostApiVersion: "1.0.0",
				actualHostApiVersion: "1.0.0",
				hostApiCompatible: true,
				capabilityCompatible: true,
				contractHashCompatible: true,
			},
			trust: {
				tier: "trusted",
				certifications: ["soc2", "iso27001"],
				meetsMinimumTier: true,
				minimumTier: "review",
			},
			selection: {
				eligible: true,
				reasons: [],
			},
		});
		expect(result.providers[1]?.selection.eligible).toBe(false);
		expect(result.providers[1]?.selection.reasons).toContain(
			"capability_contract_mismatch",
		);
	});

	test("does not hide incompatible providers and reports explicit reasons", () => {
		const result = discoveryContracts.discoverProviders({
			lockfile: lockfileFixture,
			query: {
				portId: "notifications.send",
				portVersion: "1.0.0",
				hostApiVersion: "2.0.0",
				minTrustTier: "trusted",
			},
		});

		expect(result.providers).toHaveLength(2);
		expect(result.providers[0]?.selection.eligible).toBe(false);
		expect(result.providers[0]?.selection.reasons).toContain(
			"host_api_incompatible",
		);
		expect(result.providers[0]?.selection.reasons).toContain(
			"trust_tier_below_minimum",
		);
	});

	test("is deterministic for identical discovery input", () => {
		const input = {
			lockfile: lockfileFixture,
			query: {
				portId: "notifications.send",
				portVersion: "1.0.0",
			},
		};
		const first = discoveryContracts.discoverProviders(input);
		const second = discoveryContracts.discoverProviders(input);

		expect(first).toStrictEqual(second);
		expect(JSON.stringify(first)).toBe(JSON.stringify(second));
	});
});
