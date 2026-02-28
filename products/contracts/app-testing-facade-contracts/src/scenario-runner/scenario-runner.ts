import type { ScenarioConformanceReport } from "@gooi/conformance/scenario-contracts";
import type { AppTestingScenarioFixture } from "../fixtures/fixtures";

export interface RunAppScenarioConformanceInput {
	readonly fixture: AppTestingScenarioFixture;
}

export type RunAppScenarioConformanceResult =
	Promise<ScenarioConformanceReport>;
