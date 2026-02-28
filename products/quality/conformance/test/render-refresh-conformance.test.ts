import { describe, expect, test } from "bun:test";
import { runRenderRefreshConformance } from "../src/render-refresh-conformance/run-render-refresh-conformance";
import { createRenderRefreshConformanceFixture } from "./fixtures/render-refresh-conformance.fixture";

describe("render refresh conformance", () => {
	test("runs the RFC-0012 render refresh lifecycle suite", () => {
		const fixture = createRenderRefreshConformanceFixture();
		const report = runRenderRefreshConformance(fixture);
		expect(report.passed).toBe(true);
		expect(report.checks.every((check) => check.passed)).toBe(true);
		expect(report.diagnostics?.some((item) => item.code)).toEqual(true);
	});
});
