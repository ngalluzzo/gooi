import type { ScenarioRunEnvelope } from "@gooi/scenario-contracts/envelopes";
import type { CompiledScenarioPlanSet } from "@gooi/scenario-contracts/plans";
import {
	type PersonaCoverageReport,
	reportsContracts,
} from "@gooi/scenario-contracts/reports";

const findScenarioRun = (
	runs: readonly ScenarioRunEnvelope[],
	scenarioId: string,
): ScenarioRunEnvelope | undefined =>
	runs.find((run) => run.scenarioId === scenarioId);

/**
 * Reports persona coverage/pass counts across a scenario suite result set.
 */
export const reportPersonaCoverage = (input: {
	readonly planSet: CompiledScenarioPlanSet;
	readonly runs: readonly ScenarioRunEnvelope[];
}): PersonaCoverageReport => {
	const rows = Object.keys(input.planSet.personas)
		.sort((left, right) => left.localeCompare(right))
		.map((personaId) => {
			const scenarioIds = Object.values(input.planSet.scenarios)
				.filter((scenario) => scenario.context.personaId === personaId)
				.map((scenario) => scenario.scenarioId)
				.sort((left, right) => left.localeCompare(right));
			const passingScenarios = scenarioIds.filter((scenarioId) => {
				const run = findScenarioRun(input.runs, scenarioId);
				return run?.ok === true;
			}).length;
			return {
				personaId,
				totalScenarios: scenarioIds.length,
				passingScenarios,
			};
		});

	return {
		reportVersion: reportsContracts.personaCoverageReportVersion,
		rows,
	};
};
