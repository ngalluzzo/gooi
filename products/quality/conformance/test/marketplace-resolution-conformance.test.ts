import { describe, expect, test } from "bun:test";
import { runMarketplaceResolutionConformance } from "../src/marketplace-resolution-conformance/run-marketplace-resolution-conformance";
import {
	createMarketplaceResolutionConformanceFixture,
	createMarketplaceResolutionConformancePolicyMismatchFixture,
} from "./fixtures/marketplace-resolution-conformance.fixture";

describe("marketplace resolution conformance", () => {
	test("passes deterministic explainability, policy/scoring, and delegated-route checks", () => {
		const fixture = createMarketplaceResolutionConformanceFixture();
		const report = runMarketplaceResolutionConformance(fixture);

		expect(report.passed).toBe(true);
		expect(report.checks.every((check) => check.passed)).toBe(true);
		expect(report.diagnostics).toHaveLength(0);
	});

	test("fails with typed diagnostics when policy/scoring contract checks regress", () => {
		const fixture =
			createMarketplaceResolutionConformancePolicyMismatchFixture();
		const report = runMarketplaceResolutionConformance(fixture);

		expect(report.passed).toBe(false);
		expect(
			report.checks.find(
				(check) =>
					check.id === "resolution_policy_and_scoring_contract_behavior",
			)?.passed,
		).toBe(false);
		expect(report.diagnostics).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: "conformance_parity_error",
					path: "resolution.policy_scoring",
				}),
			]),
		);
	});
});
