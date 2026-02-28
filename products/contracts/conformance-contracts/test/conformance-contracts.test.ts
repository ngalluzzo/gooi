import { describe, expect, test } from "bun:test";
import {
	parseConformanceCheckResult,
	parseVersionedConformanceCheckResult,
} from "../src/checks/checks";
import { parseConformanceDiagnosticRecord } from "../src/diagnostics/diagnostics";
import { parseConformanceFixtureDescriptor } from "../src/fixtures/fixtures";
import {
	parseConformanceSuiteReport,
	parseVersionedConformanceSuiteReport,
	serializeConformanceReportDeterministically,
} from "../src/reports/reports";
import {
	assertSupportedConformanceContractVersion,
	isConformanceContractVersionSupported,
} from "../src/version/version";

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

	test("parses versioned fixture and report envelopes", () => {
		const fixture = parseConformanceFixtureDescriptor({
			contractVersion: "1.0.0",
			fixtureId: "progressive-basic",
			laneId: "L2",
			fixtureHash: "a".repeat(64),
			artifactHashes: {
				bundle: "b".repeat(64),
			},
		});
		expect(fixture.laneId).toBe("L2");

		const versionedCheck = parseVersionedConformanceCheckResult({
			contractVersion: "1.0.0",
			check: { id: "check_id", passed: true, detail: "ok" },
		});
		expect(versionedCheck.contractVersion).toBe("1.0.0");

		const versionedReport = parseVersionedConformanceSuiteReport({
			contractVersion: "1.0.0",
			fixture,
			report: {
				passed: true,
				checks: [{ id: "check_id", passed: true, detail: "ok" }],
			},
		});
		expect(versionedReport.report.checks).toHaveLength(1);
	});

	test("serializes reports deterministically for stable comparisons", () => {
		const left = {
			report: {
				checks: [
					{ detail: "ok", id: "a", passed: true },
					{ detail: "ok", id: "b", passed: true },
				],
				passed: true,
			},
			meta: { z: 1, a: 2 },
		};
		const right = {
			meta: { a: 2, z: 1 },
			report: {
				passed: true,
				checks: [
					{ passed: true, id: "a", detail: "ok" },
					{ id: "b", detail: "ok", passed: true },
				],
			},
		};
		expect(serializeConformanceReportDeterministically(left)).toBe(
			serializeConformanceReportDeterministically(right),
		);
	});

	test("enforces explicit contract version compatibility handling", () => {
		expect(isConformanceContractVersionSupported("1.0.0")).toBe(true);
		expect(isConformanceContractVersionSupported("2.0.0")).toBe(false);
		expect(assertSupportedConformanceContractVersion("1.0.0")).toBe("1.0.0");
		expect(() => assertSupportedConformanceContractVersion("2.0.0")).toThrow();
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
