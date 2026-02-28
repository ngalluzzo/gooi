/**
 * Canonical boundary contract API.
 */
import * as reports from "./reports";

export type {
	ConformanceSuiteReport,
	ConformanceSuiteReportBase,
	ParsedVersionedConformanceSuiteReport,
	VersionedConformanceSuiteReport,
} from "./reports";

export const reportsContracts = Object.freeze({
	conformanceSuiteReportSchema: reports.conformanceSuiteReportSchema,
	parseConformanceSuiteReport: reports.parseConformanceSuiteReport,
	versionedConformanceSuiteReportSchema:
		reports.versionedConformanceSuiteReportSchema,
	parseVersionedConformanceSuiteReport:
		reports.parseVersionedConformanceSuiteReport,
	serializeConformanceReportDeterministically:
		reports.serializeConformanceReportDeterministically,
});
