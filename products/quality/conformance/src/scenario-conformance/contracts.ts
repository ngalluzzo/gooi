import type { ScenarioRunEnvelope } from "@gooi/scenario-contracts/envelopes/scenario-envelopes";
import type {
	CompiledScenarioPlanSet,
	ScenarioGeneratedInputLockSnapshot,
} from "@gooi/scenario-contracts/plans/scenario-plan";
import type {
	PersonaCoverageReport,
	ScenarioSuiteReport,
} from "@gooi/scenario-contracts/reports/scenario-reports";

export type ScenarioConformanceCheckId =
	| "trigger_expect_capture_semantics"
	| "persona_generation_lockfile_deterministic"
	| "typed_failure_traceability";

export interface ScenarioConformanceCheckResult {
	readonly id: ScenarioConformanceCheckId;
	readonly passed: boolean;
	readonly detail: string;
}

export interface ScenarioConformanceReport {
	readonly passed: boolean;
	readonly checks: readonly ScenarioConformanceCheckResult[];
	readonly lastRun?: ScenarioRunEnvelope;
	readonly suite?: ScenarioSuiteReport;
	readonly coverage?: PersonaCoverageReport;
}

export interface RunScenarioConformanceInput {
	readonly planSet: CompiledScenarioPlanSet;
	readonly lockSnapshot: ScenarioGeneratedInputLockSnapshot;
	readonly runScenario: (input: {
		readonly scenarioId: string;
		readonly lockSnapshot?: ScenarioGeneratedInputLockSnapshot;
	}) => Promise<ScenarioRunEnvelope>;
	readonly runSuite: (input: {
		readonly lockSnapshot?: ScenarioGeneratedInputLockSnapshot;
		readonly tags?: readonly string[];
	}) => Promise<ScenarioSuiteReport>;
	readonly coverageReport: (input: {
		readonly runs: readonly ScenarioRunEnvelope[];
	}) => PersonaCoverageReport;
}
