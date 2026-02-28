import type {
	AppTestingScenarioFixture,
	CreateAppTestingScenarioFixtureInput,
} from "@gooi/app-testing-facade-contracts/fixtures";

export const createScenarioFixture = (
	input: CreateAppTestingScenarioFixtureInput,
): AppTestingScenarioFixture => ({
	planSet: input.planSet,
	lockSnapshot: input.lockSnapshot,
	harness: input.harness,
});
