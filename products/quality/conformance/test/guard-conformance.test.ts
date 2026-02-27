import { describe, expect, test } from "bun:test";
import { runGuardConformance } from "../src/guard-conformance/run-guard-conformance";
import { createGuardConformanceFixture } from "./fixtures/guard-conformance.fixture";

describe("guard conformance", () => {
	test("runs guard-runtime conformance checks", async () => {
		const fixture = createGuardConformanceFixture();
		const report = await runGuardConformance(fixture);
		expect(report.passed).toBe(true);
		expect(report.checks.every((check) => check.passed)).toBe(true);
	});
});
