import { describe, expect, test } from "bun:test";

import { runCrossClientReadinessConformance } from "../src/cross-client-readiness-conformance/run-cross-client-readiness-conformance";
import { createAuthoringConformanceFixture } from "./fixtures/authoring-conformance.fixture";

describe("cross-client readiness conformance", () => {
	test("runs the RFC-0004 cross-client readiness baseline suite", () => {
		const fixture = createAuthoringConformanceFixture();
		const report = runCrossClientReadinessConformance(fixture);

		expect(report.passed).toBe(true);
		expect(report.checks.map((check) => check.id)).toEqual([
			"portable_protocol_surface",
			"protocol_fixture_parity",
			"client_deviation_catalog",
		]);
		expect(report.checks.every((check) => check.passed)).toBe(true);
	});
});
