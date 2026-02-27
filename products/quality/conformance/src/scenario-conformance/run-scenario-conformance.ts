import type {
	RunScenarioConformanceInput,
	ScenarioConformanceReport,
} from "./contracts";

const buildCheck = (
	id: ScenarioConformanceReport["checks"][number]["id"],
	passed: boolean,
	detail: string,
): ScenarioConformanceReport["checks"][number] => ({ id, passed, detail });

/**
 * Runs scenario-runtime conformance checks for trigger/expect/capture and persona lockfile behavior.
 */
export const runScenarioConformance = async (
	input: RunScenarioConformanceInput,
): Promise<ScenarioConformanceReport> => {
	const checks: Array<ScenarioConformanceReport["checks"][number]> = [];

	const happy = await input.runScenario({
		scenarioId: "happy_path",
		lockSnapshot: input.lockSnapshot,
	});
	checks.push(
		buildCheck(
			"trigger_expect_capture_semantics",
			happy.ok && happy.stepResults.length > 1,
			happy.ok && happy.stepResults.length > 1
				? "Scenario runtime executes trigger/expect/capture semantics deterministically."
				: "Scenario trigger/expect/capture semantics did not execute as expected.",
		),
	);

	const firstGenerated = await input.runScenario({
		scenarioId: "happy_path",
	});
	const replayGenerated = await input.runScenario({
		scenarioId: "happy_path",
		lockSnapshot: firstGenerated.lockSnapshot,
	});
	checks.push(
		buildCheck(
			"persona_generation_lockfile_deterministic",
			firstGenerated.ok &&
				replayGenerated.ok &&
				firstGenerated.lockSnapshot.generated.happy_path?.[0] !== undefined &&
				JSON.stringify(firstGenerated.lockSnapshot) ===
					JSON.stringify(replayGenerated.lockSnapshot),
			firstGenerated.ok &&
				replayGenerated.ok &&
				JSON.stringify(firstGenerated.lockSnapshot) ===
					JSON.stringify(replayGenerated.lockSnapshot)
				? "Persona generation is lockfile-backed and deterministic by default."
				: "Generated-trigger lock snapshot replay was nondeterministic.",
		),
	);

	const failing = await input.runScenario({ scenarioId: "rejection_path" });
	checks.push(
		buildCheck(
			"typed_failure_traceability",
			!failing.ok && typeof failing.error?.stepIndex === "number",
			!failing.ok && typeof failing.error?.stepIndex === "number"
				? "Scenario failures return typed diagnostics with step-level traceability."
				: "Scenario failures were not typed or traceable at the step level.",
		),
	);

	const suite = await input.runSuite({ tags: ["smoke"] });
	const coverage = input.coverageReport({ runs: suite.runs });

	return {
		passed: checks.every((check) => check.passed),
		checks,
		lastRun: failing,
		suite,
		coverage,
	};
};
