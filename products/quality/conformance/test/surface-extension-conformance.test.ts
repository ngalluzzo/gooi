import { describe, expect, test } from "bun:test";
import { runSurfaceExtensionConformance } from "../src/surface-extension-conformance/run-surface-extension-conformance";
import { createSurfaceExtensionConformanceTemplateFixture } from "./fixtures/surface-extension-conformance.template.fixture";

describe("surface extension conformance", () => {
	test("runs the reusable new-surface extension template suite", () => {
		const fixture = createSurfaceExtensionConformanceTemplateFixture();
		const report = runSurfaceExtensionConformance(fixture);

		expect(report.passed).toBe(true);
		expect(report.checks).toHaveLength(3);
		expect(report.checks.map((check) => check.id)).toEqual([
			"adapter_extension_without_core_changes",
			"typed_extension_failure_diagnostics",
			"deterministic_extension_dispatch",
		]);
		expect(report.snapshot?.surfaceId).toBe("chat");
		expect(report.snapshot?.entrypointId).toBe("list_messages");
		expect(report.diagnostics?.map((item) => item.code)).toEqual([
			"dispatch_transport_error",
		]);
	});
});
