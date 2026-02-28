import { describe, expect, test } from "bun:test";
import type { AppTestingScenarioFixture } from "../src/fixtures/fixtures";

describe("app-testing-facade-contracts", () => {
	test("retains fixture contract shape", () => {
		const fixture: AppTestingScenarioFixture = {
			planSet: {} as AppTestingScenarioFixture["planSet"],
			lockSnapshot: {} as AppTestingScenarioFixture["lockSnapshot"],
			harness: {
				runScenario: async () =>
					({}) as Awaited<
						ReturnType<AppTestingScenarioFixture["harness"]["runScenario"]>
					>,
				runSuite: async () =>
					({}) as Awaited<
						ReturnType<AppTestingScenarioFixture["harness"]["runSuite"]>
					>,
				coverageReport: () =>
					({}) as ReturnType<
						AppTestingScenarioFixture["harness"]["coverageReport"]
					>,
			},
		};
		expect(typeof fixture.harness.runScenario).toBe("function");
	});
});
