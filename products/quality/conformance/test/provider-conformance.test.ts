import { describe, expect, test } from "bun:test";
import { runProviderConformance } from "../src/provider-conformance/run-provider-conformance";
import { createProviderConformanceFixture } from "./fixtures/provider-conformance.fixture";

describe("provider conformance", () => {
	test("runs the RFC-0001 provider conformance suite", async () => {
		const fixture = createProviderConformanceFixture();
		const report = await runProviderConformance(fixture);
		expect(report.passed).toBe(true);
		expect(report.checks.every((check) => check.passed)).toBe(true);
	});
});
