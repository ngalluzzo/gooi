import { describe, expect, test } from "bun:test";
import { runMarketplaceTrustConformance } from "../src/marketplace-trust-conformance/run-marketplace-trust-conformance";
import {
	createMarketplaceTrustConformanceFixture,
	createMarketplaceTrustConformanceRevocationMismatchFixture,
} from "./fixtures/marketplace-trust-conformance.fixture";

describe("marketplace trust conformance", () => {
	test("passes trust/certification coupling and revocation fail-closed checks", () => {
		const fixture = createMarketplaceTrustConformanceFixture();
		const report = runMarketplaceTrustConformance(fixture);

		expect(report.passed).toBe(true);
		expect(report.checks.every((check) => check.passed)).toBe(true);
		expect(report.diagnostics).toHaveLength(0);
	});

	test("fails with typed diagnostics when revocation propagation does not fail closed", () => {
		const fixture =
			createMarketplaceTrustConformanceRevocationMismatchFixture();
		const report = runMarketplaceTrustConformance(fixture);

		expect(report.passed).toBe(false);
		expect(
			report.checks.find(
				(check) => check.id === "revocation_propagation_fail_closed_behavior",
			)?.passed,
		).toBe(false);
		expect(report.diagnostics).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: "marketplace_revocation_propagation_error",
					path: "trust.revocation_propagation",
				}),
			]),
		);
	});
});
