import { describe, expect, test } from "bun:test";
import { runMarketplaceControlPlaneConformance } from "../src/marketplace-control-plane-conformance/run-marketplace-control-plane-conformance";
import {
	createMarketplaceControlPlaneConformanceFixture,
	createMarketplaceControlPlaneConformancePolicyFailureFixture,
} from "./fixtures/marketplace-control-plane-conformance.fixture";

describe("marketplace control-plane conformance", () => {
	test("passes listing/catalog/certification control-plane contract checks", () => {
		const fixture = createMarketplaceControlPlaneConformanceFixture();
		const report = runMarketplaceControlPlaneConformance(fixture);

		expect(report.passed).toBe(true);
		expect(report.checks.every((check) => check.passed)).toBe(true);
		expect(report.governanceEnvelopeDigest.length).toBeGreaterThan(0);
		expect(report.diagnostics).toHaveLength(0);
	});

	test("fails with typed certification diagnostics when certification policy requirements regress", () => {
		const fixture =
			createMarketplaceControlPlaneConformancePolicyFailureFixture();
		const report = runMarketplaceControlPlaneConformance(fixture);

		expect(report.passed).toBe(false);
		expect(
			report.checks.find(
				(check) => check.id === "certification_contract_behavior",
			)?.passed,
		).toBe(false);
		expect(report.diagnostics).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: "certification_requirement_error",
					path: "certification.workflow",
				}),
			]),
		);
	});
});
