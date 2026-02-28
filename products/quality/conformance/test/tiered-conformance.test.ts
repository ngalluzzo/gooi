import { describe, expect, test } from "bun:test";
import { runTieredConformance } from "../src/tiered-conformance/run-tiered-conformance";
import {
	createTieredConformanceFixture,
	createTieredConformanceFlakyFailureFixture,
	createTieredConformanceRuntimeFailureFixture,
} from "./fixtures/tiered-conformance.fixture";

describe("tiered conformance", () => {
	test("passes with centrally versioned smoke/full/expanded definitions", async () => {
		const fixture = createTieredConformanceFixture();
		const report = await runTieredConformance(fixture);

		expect(report.passed).toBe(true);
		expect(report.version).toBe("1.0.0");
		expect(report.tierId).toBe("smoke");
		expect(report.gateRole).toBe("pull_request_gate");
		expect(report.checks.every((check) => check.passed)).toBe(true);
	});

	test("fails when runtime thresholds are exceeded", async () => {
		const fixture = createTieredConformanceRuntimeFailureFixture();
		const report = await runTieredConformance(fixture);

		expect(report.passed).toBe(false);
		expect(
			report.checks.find((check) => check.id === "runtime_thresholds_enforced")
				?.passed,
		).toBe(false);
	});

	test("fails when flaky-rate thresholds are exceeded", async () => {
		const fixture = createTieredConformanceFlakyFailureFixture();
		const report = await runTieredConformance(fixture);

		expect(report.passed).toBe(false);
		expect(
			report.checks.find(
				(check) => check.id === "flaky_rate_thresholds_enforced",
			)?.passed,
		).toBe(false);
	});
});
