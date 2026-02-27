import { describe, expect, test } from "bun:test";
import { runReachabilityParitySuite } from "../src/reachability-parity/run-reachability-parity-suite";
import {
	createReachabilityParityFixture,
	createReachabilityParityMismatchFixture,
} from "./fixtures/reachability-parity.fixture";

describe("reachability parity conformance", () => {
	test("passes when local and delegated execution remain equivalent", async () => {
		const fixture = createReachabilityParityFixture();
		const report = await runReachabilityParitySuite(fixture);

		expect(report.passed).toBe(true);
		expect(report.checks.every((check) => check.passed)).toBe(true);
		expect(report.diagnostics).toHaveLength(0);
	});

	test("fails with typed diagnostic when delegated output diverges", async () => {
		const fixture = createReachabilityParityMismatchFixture();
		const report = await runReachabilityParitySuite(fixture);

		expect(report.passed).toBe(false);
		expect(
			report.checks.find((check) => check.id === "output_parity")?.passed,
		).toBe(false);
		expect(report.diagnostics).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: "conformance_reachability_parity_error",
					path: "output_parity",
				}),
			]),
		);
	});
});
