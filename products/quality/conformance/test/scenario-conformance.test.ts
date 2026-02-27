import { describe, expect, test } from "bun:test";
import { runScenarioConformance } from "../src/scenario-conformance/run-scenario-conformance";
import { createScenarioConformanceFixture } from "./fixtures/scenario-conformance.fixture";

describe("scenario conformance", () => {
	test("runs scenario-runtime conformance checks", async () => {
		const fixture = createScenarioConformanceFixture();
		const report = await runScenarioConformance(fixture);
		expect(report.passed).toBe(true);
		expect(report.checks.every((check) => check.passed)).toBe(true);
	});
});
