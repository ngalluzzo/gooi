import type { ScenarioRunEnvelope } from "../envelopes/scenario-envelopes";

export const scenarioSuiteReportVersion = "1.0.0" as const;

export interface ScenarioSuiteReport {
	readonly reportVersion: typeof scenarioSuiteReportVersion;
	readonly ok: boolean;
	readonly selectedScenarioIds: readonly string[];
	readonly runs: readonly ScenarioRunEnvelope[];
}

export const personaCoverageReportVersion = "1.0.0" as const;

export interface PersonaCoverageRow {
	readonly personaId: string;
	readonly totalScenarios: number;
	readonly passingScenarios: number;
}

export interface PersonaCoverageReport {
	readonly reportVersion: typeof personaCoverageReportVersion;
	readonly rows: readonly PersonaCoverageRow[];
}
