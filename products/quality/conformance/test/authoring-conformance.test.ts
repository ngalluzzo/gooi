import { describe, expect, test } from "bun:test";

import { runAuthoringConformance } from "../src/authoring-conformance/run-authoring-conformance";
import { createAuthoringConformanceFixture } from "./fixtures/authoring-conformance.fixture";

describe("authoring conformance", () => {
	test("runs the RFC-0003 authoring conformance suite", () => {
		const fixture = createAuthoringConformanceFixture();
		const report = runAuthoringConformance(fixture);

		expect(report.passed).toBe(true);
		expect(report.checks.map((check) => check.id)).toEqual([
			"completion_correctness",
			"cli_lsp_parity",
			"diagnostics_parity",
			"reachability_diagnostics",
			"guard_scenario_diagnostics",
			"guard_scenario_completion",
			"lens_correctness",
			"expression_symbol_resolution",
			"rename_safety",
			"signal_impact_chain",
		]);
		expect(report.checks.every((check) => check.passed)).toBe(true);
	});
});
