import { describe, expect, test } from "bun:test";
import { eligibilityContracts } from "@gooi/marketplace-contracts/eligibility";
import { resolutionContracts } from "@gooi/marketplace-contracts/resolution";
import { discoverProviders } from "../src/discover/discover-providers";
import { explainProviderEligibility } from "../src/eligibility/explain-provider-eligibility";
import { resolveTrustedProviders } from "../src/resolve/resolve-trusted-providers";
import { createDiscoveryInputFixture } from "./fixtures/discovery.fixture";

describe("@gooi/app-marketplace eligibility and resolve", () => {
	test("maintains semantic parity for eligibility and trusted resolution", () => {
		const catalog = discoverProviders(createDiscoveryInputFixture());
		const facadeEligibility = explainProviderEligibility({
			catalog,
			requiredCertifications: ["soc2"],
		});
		const baselineEligibility = eligibilityContracts.explainProviderEligibility(
			{
				catalog,
				requiredCertifications: ["soc2"],
			},
		);
		expect(JSON.stringify(facadeEligibility)).toBe(
			JSON.stringify(baselineEligibility),
		);

		if (!facadeEligibility.ok) {
			return;
		}

		const facadeResolution = resolveTrustedProviders({
			report: facadeEligibility.report,
			maxResults: 2,
			requireEligible: false,
		});
		const baselineResolution = resolutionContracts.resolveTrustedProviders({
			report: facadeEligibility.report,
			maxResults: 2,
			requireEligible: false,
		});
		expect(JSON.stringify(facadeResolution)).toBe(
			JSON.stringify(baselineResolution),
		);
		expect(facadeResolution.ok).toBe(true);
		if (!facadeResolution.ok) {
			return;
		}
		expect(facadeResolution.decision.selected[1]?.reachability).toEqual({
			mode: "delegated",
			targetHost: "node",
			delegateRouteId: "route-node-1",
			delegateDescriptor: "https://gooi.dev/delegation/route-node-1",
		});
	});

	test("preserves canonical resolver taxonomy for failure responses", () => {
		const result = resolveTrustedProviders({
			report: {} as never,
		});

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.error.code).toBe("resolver_request_schema_error");
	});

	test("fails with typed delegation errors when delegated metadata is incomplete", () => {
		const catalog = discoverProviders(createDiscoveryInputFixture());
		const eligibility = explainProviderEligibility({
			catalog,
			requiredCertifications: [],
		});
		expect(eligibility.ok).toBe(true);
		if (!eligibility.ok) {
			return;
		}

		const report = {
			...eligibility.report,
			providers: eligibility.report.providers.map((provider) => {
				if (provider.providerId === "gooi.providers.http") {
					return {
						...provider,
						reachability: {
							mode: "delegated" as const,
							targetHost: "node" as const,
						},
					};
				}
				return provider;
			}),
		};
		const facade = resolveTrustedProviders({
			report,
			maxResults: 2,
			requireEligible: false,
		});
		const baseline = resolutionContracts.resolveTrustedProviders({
			report,
			maxResults: 2,
			requireEligible: false,
		});

		expect(JSON.stringify(facade)).toBe(JSON.stringify(baseline));
		expect(facade.ok).toBe(false);
		if (facade.ok) {
			return;
		}
		expect(facade.error.code).toBe("resolver_delegation_unavailable_error");
	});
});
