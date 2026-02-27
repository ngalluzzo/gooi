import type {
	CompiledScenarioPlanSet,
	ScenarioGeneratedInputLockSnapshot,
} from "@gooi/scenario-contracts/plans/scenario-plan";
import {
	type ScenarioSuiteReport,
	scenarioSuiteReportVersion,
} from "@gooi/scenario-contracts/reports/scenario-reports";
import type {
	RunScenarioInput,
	ScenarioExecutionProfile,
} from "../run/contracts";
import { runScenario } from "../run/run-scenario";

const emptyLockSnapshot: ScenarioGeneratedInputLockSnapshot = {
	generated: {},
};

const selectScenarioIds = (
	planSet: CompiledScenarioPlanSet,
	tags: readonly string[] | undefined,
): readonly string[] => {
	const all = Object.keys(planSet.scenarios).sort((left, right) =>
		left.localeCompare(right),
	);
	if (tags === undefined || tags.length === 0) {
		return all;
	}
	const required = new Set(tags);
	return all.filter((scenarioId) => {
		const scenario = planSet.scenarios[scenarioId];
		if (scenario === undefined) {
			return false;
		}
		return scenario.tags.some((tag) => required.has(tag));
	});
};

/**
 * Runs a deterministic scenario suite in stable scenario-id order.
 */
export const runScenarioSuite = async (input: {
	readonly planSet: CompiledScenarioPlanSet;
	readonly tags?: readonly string[];
	readonly lockSnapshot?: ScenarioGeneratedInputLockSnapshot;
	readonly profile?: ScenarioExecutionProfile;
	readonly runInput: Omit<
		RunScenarioInput,
		"scenario" | "personas" | "lockSnapshot" | "profile"
	>;
}): Promise<ScenarioSuiteReport> => {
	const selectedScenarioIds = selectScenarioIds(input.planSet, input.tags);
	const runs: Array<ScenarioSuiteReport["runs"][number]> = [];
	const profile = input.profile ?? "default_ci";
	let lockSnapshot = input.lockSnapshot ?? emptyLockSnapshot;
	for (const scenarioId of selectedScenarioIds) {
		const scenario = input.planSet.scenarios[scenarioId];
		if (scenario === undefined) {
			continue;
		}
		const run = await runScenario({
			scenario,
			personas: input.planSet.personas,
			lockSnapshot,
			profile,
			...input.runInput,
		});
		runs.push(run);
		if (run.ok) {
			lockSnapshot = run.lockSnapshot;
		}
	}

	return {
		reportVersion: scenarioSuiteReportVersion,
		ok: runs.every((run) => run.ok),
		selectedScenarioIds,
		runs,
	};
};
