import { describe, expect, test } from "bun:test";
import { parseConformanceCheckResult } from "../src/checks/checks";
import { parseConformanceDiagnosticRecord } from "../src/diagnostics/diagnostics";
import { parseConformanceSuiteReport } from "../src/reports/reports";

describe("conformance-contracts", () => {
	test("parses check results", () => {
		const parsed = parseConformanceCheckResult({
			id: "check_id",
			passed: true,
			detail: "ok",
		});
		expect(parsed.passed).toBe(true);
	});

	test("parses suite reports", () => {
		const parsed = parseConformanceSuiteReport({
			passed: true,
			checks: [{ id: "check_id", passed: true, detail: "ok" }],
		});
		expect(parsed.checks).toHaveLength(1);
	});

	test("parses diagnostic records", () => {
		const parsed = parseConformanceDiagnosticRecord({
			code: "conformance_error",
			message: "bad",
			path: "checks[0]",
		});
		expect(parsed.code).toBe("conformance_error");
	});
});
