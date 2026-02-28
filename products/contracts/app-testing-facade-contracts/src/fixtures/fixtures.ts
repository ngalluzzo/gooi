import type { ScenarioRunEnvelope } from "@gooi/scenario-contracts/envelopes";
import type {
	CompiledScenarioPlanSet,
	ScenarioGeneratedInputLockSnapshot,
} from "@gooi/scenario-contracts/plans";
import type {
	PersonaCoverageReport,
	ScenarioSuiteReport,
} from "@gooi/scenario-contracts/reports";

export interface AppTestingScenarioHarness {
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

export interface AppTestingScenarioFixture {
	readonly planSet: CompiledScenarioPlanSet;
	readonly lockSnapshot: ScenarioGeneratedInputLockSnapshot;
	readonly harness: AppTestingScenarioHarness;
}

export type CreateAppTestingScenarioFixtureInput = AppTestingScenarioFixture;
