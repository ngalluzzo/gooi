import { describe, expect, test } from "bun:test";
import { runRenderAdapterConformance } from "../src/render-adapter-conformance/run-render-adapter-conformance";
import { createRenderAdapterConformanceFixture } from "./fixtures/render-adapter-conformance.fixture";

describe("render adapter conformance", () => {
	test("runs the RFC-0012 renderer adapter compatibility suite", () => {
		const fixture = createRenderAdapterConformanceFixture();
		const report = runRenderAdapterConformance(fixture);
		expect(report.passed).toBe(true);
		expect(report.checks.every((check) => check.passed)).toBe(true);
		expect(report.diagnostics?.some((item) => item.code)).toEqual(true);
	});
});
