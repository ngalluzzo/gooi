import { describe, expect, test } from "bun:test";
import { runScenarioConformance } from "@gooi/conformance/scenario";
import { createScenarioFixture } from "../src/fixtures/create-scenario-fixture";
import { runAppScenarioConformance } from "../src/scenario-runner/run-app-scenario-conformance";
import { createAppTestingFixture } from "./fixtures/app-testing.fixture";

describe("@gooi/app-testing facade", () => {
	test("runs thin conformance wrapper with deterministic parity to base harness", async () => {
		const fixture = createAppTestingFixture();
		const wrapped = await runAppScenarioConformance({
			fixture: createScenarioFixture(fixture),
		});
		const baseline = await runScenarioConformance({
			planSet: fixture.planSet,
			lockSnapshot: fixture.lockSnapshot,
			runScenario: fixture.harness.runScenario,
			runSuite: fixture.harness.runSuite,
			coverageReport: fixture.harness.coverageReport,
		});
		expect(JSON.stringify(wrapped)).toBe(JSON.stringify(baseline));
	});

	test("fixture helper preserves canonical harness contracts without assertion dialect", () => {
		const fixture = createAppTestingFixture();
		const wrappedFixture = createScenarioFixture(fixture);
		expect(wrappedFixture.planSet).toBe(fixture.planSet);
		expect(wrappedFixture.lockSnapshot).toBe(fixture.lockSnapshot);
		expect(wrappedFixture.harness.runScenario).toBe(
			fixture.harness.runScenario,
		);
		expect(wrappedFixture.harness.runSuite).toBe(fixture.harness.runSuite);
		expect(wrappedFixture.harness.coverageReport).toBe(
			fixture.harness.coverageReport,
		);
	});
});
