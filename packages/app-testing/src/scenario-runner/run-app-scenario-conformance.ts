import type {
	RunAppScenarioConformanceInput,
	RunAppScenarioConformanceResult,
} from "@gooi/app-testing-facade-contracts/scenario-runner";
import { runScenarioConformance } from "@gooi/conformance/scenario";

export const runAppScenarioConformance = (
	input: RunAppScenarioConformanceInput,
): RunAppScenarioConformanceResult =>
	runScenarioConformance({
		planSet: input.fixture.planSet,
		lockSnapshot: input.fixture.lockSnapshot,
		runScenario: input.fixture.harness.runScenario,
		runSuite: input.fixture.harness.runSuite,
		coverageReport: input.fixture.harness.coverageReport,
	});
