import { describe, expect, test } from "bun:test";
import { discoverContracts } from "../src/discover/contracts";
import { eligibilityContracts } from "../src/eligibility/contracts";
import { resolveContracts } from "../src/resolve/contracts";

describe("app-marketplace-facade-contracts", () => {
	test("parses discovery input via canonical marketplace contracts", () => {
		const parsed = discoverContracts.parseDiscoverProvidersInput({
			lockfile: {
				appId: "demo-app",
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
								portId: "ids.generate",
								portVersion: "1.0.0",
								contractHash:
									"0f8f7ea8a9d837f76f16fdb5bf8f95d727ec4fdd6d8f45f0c6bf3d9c7d17d2cf",
							},
						],
					},
				],
			},
			query: {
				portId: "ids.generate",
				portVersion: "1.0.0",
			},
		});

		expect(parsed.query.portId).toBe("ids.generate");
		expect(parsed.lockfile.providers[0]?.providerId).toBe(
			"gooi.providers.memory",
		);
	});

	test("exposes canonical eligibility and resolution wrappers", () => {
		const catalog = {
			query: {
				portId: "ids.generate",
				portVersion: "1.0.0",
				hostApiVersion: "1.0.0",
			},
			providers: [
				{
					providerId: "gooi.providers.memory",
					providerVersion: "1.2.3",
					integrity:
						"sha256:6a6f9c2f84fcb56af6dcaaf7af66c74d4d2e7070f951e8fbcf48f7cb13f12777",
					reachability: {
						mode: "local",
					},
					compatibility: {
						requiredHostApiVersion: "1.0.0",
						actualHostApiVersion: "1.0.0",
						hostApiCompatible: true,
						capabilityCompatible: true,
						contractHashCompatible: true,
					},
					trust: {
						tier: "trusted" as const,
						certifications: ["soc2"],
						meetsMinimumTier: true,
					},
					selection: {
						eligible: true,
						reasons: [],
					},
				},
			],
		};
		const eligibility = eligibilityContracts.explainProviderEligibility({
			catalog,
			requiredCertifications: ["soc2"],
		});
		expect(eligibility.ok).toBe(true);
		if (!eligibility.ok) {
			return;
		}
		const resolution = resolveContracts.resolveTrustedProviders({
			report: eligibility.report,
			maxResults: 1,
		});
		expect(resolution.ok).toBe(true);
		if (!resolution.ok) {
			return;
		}
		expect(resolution.decision.selected[0]?.providerId).toBe(
			"gooi.providers.memory",
		);
	});
});
