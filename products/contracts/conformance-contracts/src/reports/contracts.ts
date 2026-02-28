/**
 * Canonical boundary contract API.
 */
import * as reports from "./reports";

export type {
	ConformanceSuiteReport,
	ConformanceSuiteReportBase,
} from "./reports";

export const reportsContracts = Object.freeze({
	conformanceSuiteReportSchema: reports.conformanceSuiteReportSchema,
	parseConformanceSuiteReport: reports.parseConformanceSuiteReport,
});
