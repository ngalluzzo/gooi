import { describe, expect, test } from "bun:test";
import { runDispatchRenderConformance } from "../src/dispatch-render-conformance/run-dispatch-render-conformance";
import { createDispatchRenderConformanceFixture } from "./fixtures/dispatch-render-conformance.fixture";

describe("dispatch render conformance", () => {
	test("runs the RFC-0011/RFC-0012 dispatch-to-render pipeline suite", async () => {
		const fixture = createDispatchRenderConformanceFixture();
		const report = await runDispatchRenderConformance(fixture);

		expect(report.passed).toBe(true);
		expect(report.checks).toHaveLength(3);
		expect(report.checks.map((check) => check.id)).toEqual([
			"route_dispatch_renders_output",
			"typed_error_envelopes_preserved",
			"deterministic_render_output",
		]);
		expect(report.render?.ok).toBe(true);
		expect(report.render?.screenId).toBe("home");
		expect(report.diagnostics?.map((item) => item.code)).toEqual([
			"dispatch_transport_error",
			"access_denied_error",
		]);
	});
});
