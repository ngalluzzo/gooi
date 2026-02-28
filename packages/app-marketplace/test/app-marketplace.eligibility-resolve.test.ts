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
			maxResults: 1,
		});
		const baselineResolution = resolutionContracts.resolveTrustedProviders({
			report: facadeEligibility.report,
			maxResults: 1,
		});
		expect(JSON.stringify(facadeResolution)).toBe(
			JSON.stringify(baselineResolution),
		);
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
});
