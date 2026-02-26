import { describe, expect, test } from "bun:test";
import { runHostConformance } from "../src/host-conformance/run-host-conformance";
import { createHostConformanceFixture } from "./fixtures/host-conformance.fixture";

describe("host conformance", () => {
	test("runs host contract conformance checks", async () => {
		const fixture = createHostConformanceFixture();
		const report = await runHostConformance(fixture);
		expect(report.passed).toBe(true);
		expect(report.checks.every((check) => check.passed)).toBe(true);
	});
});
