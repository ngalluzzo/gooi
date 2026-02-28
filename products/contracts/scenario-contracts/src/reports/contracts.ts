/**
 * Canonical boundary contract API.
 */
import * as scenario_reports from "./scenario-reports";

export type {
	PersonaCoverageReport,
	PersonaCoverageRow,
	ScenarioSuiteReport,
} from "./scenario-reports";

export const reportsContracts = Object.freeze({
	scenarioSuiteReportVersion: scenario_reports.scenarioSuiteReportVersion,
	personaCoverageReportVersion: scenario_reports.personaCoverageReportVersion,
});
