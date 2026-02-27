import type { ConformanceCheckResultBase } from "@gooi/conformance-contracts/checks";
import type { ConformanceSuiteReportBase } from "@gooi/conformance-contracts/reports";
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

export type ScenarioConformanceCheckResult =
	ConformanceCheckResultBase<ScenarioConformanceCheckId>;

export interface ScenarioConformanceReport
	extends ConformanceSuiteReportBase<ScenarioConformanceCheckResult> {
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
