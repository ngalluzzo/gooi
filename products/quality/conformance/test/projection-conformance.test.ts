import { describe, expect, test } from "bun:test";
import { runProjectionConformance } from "../src/projection-conformance/run-projection-conformance";
import { createProjectionConformanceFixture } from "./fixtures/projection-conformance.fixture";

describe("projection conformance", () => {
	test("runs projection-domain parity checks", async () => {
		const fixture = createProjectionConformanceFixture();
		const report = await runProjectionConformance(fixture);
		expect(report.passed).toBe(true);
		expect(report.checks.every((check) => check.passed)).toBe(true);
	});
});
