import { describe, expect, test } from "bun:test";
import { runDeterminismConformance } from "../src/determinism-conformance/run-determinism-conformance";
import {
	createDeterminismConformanceFixture,
	createDeterminismConformanceMismatchFixture,
} from "./fixtures/determinism-conformance.fixture";

describe("determinism conformance", () => {
	test("passes when repeated artifact and envelope outputs are stable", async () => {
		const fixture = createDeterminismConformanceFixture();
		const report = await runDeterminismConformance(fixture);

		expect(report.passed).toBe(true);
		expect(report.checks.every((check) => check.passed)).toBe(true);
		expect(report.diagnostics).toHaveLength(0);
	});

	test("fails with typed determinism diagnostics on output drift", async () => {
		const fixture = createDeterminismConformanceMismatchFixture();
		const report = await runDeterminismConformance(fixture);

		expect(report.passed).toBe(false);
		expect(
			report.checks.find(
				(check) => check.id === "artifact_outputs_deterministic",
			)?.passed,
		).toBe(false);
		expect(
			report.checks.find(
				(check) => check.id === "envelope_outputs_deterministic",
			)?.passed,
		).toBe(false);
		expect(report.diagnostics).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: "conformance_determinism_error",
					path: "artifact.compiled_bundle",
				}),
				expect.objectContaining({
					code: "conformance_determinism_error",
					path: "envelope.runtime_envelope",
				}),
			]),
		);
	});
});
