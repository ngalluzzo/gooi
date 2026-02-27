import { describe, expect, test } from "bun:test";
import { createScenarioError } from "../src/errors/scenario-errors";
import type { CompiledScenarioPlanSet } from "../src/plans/scenario-plan";

describe("scenario contracts", () => {
	test("expresses scenario plan and lock snapshot contracts", () => {
		const planSet: CompiledScenarioPlanSet = {
			artifactVersion: "1.0.0",
			artifactHash: "artifact_hash",
			sectionHash: "section_hash",
			personas: {
				guest: {
					personaId: "guest",
					description: "Default user persona",
					traits: { tone: "neutral" },
					history: [],
					tags: ["authenticated"],
				},
			},
			scenarios: {
				happy_path: {
					scenarioId: "happy_path",
					tags: ["smoke"],
					context: { personaId: "guest" },
					steps: [
						{
							kind: "trigger",
							trigger: {
								entrypointKind: "mutation",
								entrypointId: "submit_message",
								input: { message: "hello" },
							},
						},
					],
				},
			},
		};

		expect(planSet.scenarios.happy_path?.steps.length).toBe(1);
	});

	test("creates typed scenario errors", () => {
		const error = createScenarioError(
			"scenario_expectation_error",
			"Expected signal was not observed.",
			"happy_path",
			1,
			{ signalId: "message.created" },
		);

		expect(error.code).toBe("scenario_expectation_error");
		expect(error.details).toEqual({ signalId: "message.created" });
	});
});
