import type {
	CanonicalSpecModel,
	CompileDiagnostic,
} from "../compile.contracts";
import { asRecord, asString, referenceNotFound } from "./shared";

/**
 * Validates scenario references to personas, mutations, queries, flows, and projections.
 *
 * @param model - Canonical in-memory model.
 * @returns Scenario-reference diagnostics.
 */
export const validateScenarioLinks = (
	model: CanonicalSpecModel,
): readonly CompileDiagnostic[] => {
	const diagnostics: CompileDiagnostic[] = [];
	const personaIds = new Set(model.references.personaIds);
	const mutationIds = new Set(model.references.mutationIds);
	const queryIds = new Set(model.references.queryIds);
	const domain = asRecord(model.sections.domain) ?? {};
	const flowIds = new Set(Object.keys(asRecord(domain.flows) ?? {}));
	const projectionIds = new Set(model.references.projectionIds);
	const scenarios = asRecord(model.sections.scenarios) ?? {};

	for (const [scenarioId, scenarioValue] of Object.entries(scenarios)) {
		const scenario = asRecord(scenarioValue) ?? {};
		const context = asRecord(scenario.context) ?? {};
		const personaId = asString(context.persona);
		if (personaId !== undefined && !personaIds.has(personaId)) {
			diagnostics.push(
				referenceNotFound(
					`scenarios.${scenarioId}.context.persona`,
					`Scenario references unknown persona \`${personaId}\`.`,
					"Declare the persona under `personas` or update the scenario context.",
				),
			);
		}

		const steps = Array.isArray(scenario.steps) ? scenario.steps : [];
		for (const [stepIndex, stepValue] of steps.entries()) {
			const step = asRecord(stepValue) ?? {};
			const trigger = asRecord(step.trigger) ?? {};
			const expectRecord = asRecord(step.expect) ?? {};

			const mutationId = asString(trigger.mutation);
			if (mutationId !== undefined && !mutationIds.has(mutationId)) {
				diagnostics.push(
					referenceNotFound(
						`scenarios.${scenarioId}.steps.${stepIndex}.trigger.mutation`,
						`Scenario trigger references unknown mutation \`${mutationId}\`.`,
						"Declare the mutation under `mutations` or update the trigger.",
					),
				);
			}

			const queryId = asString(expectRecord.query);
			if (queryId !== undefined && !queryIds.has(queryId)) {
				diagnostics.push(
					referenceNotFound(
						`scenarios.${scenarioId}.steps.${stepIndex}.expect.query`,
						`Scenario expectation references unknown query \`${queryId}\`.`,
						"Declare the query under `queries` or update the expectation.",
					),
				);
			}

			const flowId = asString(expectRecord.flow_completed);
			if (flowId !== undefined && !flowIds.has(flowId)) {
				diagnostics.push(
					referenceNotFound(
						`scenarios.${scenarioId}.steps.${stepIndex}.expect.flow_completed`,
						`Scenario expectation references unknown flow \`${flowId}\`.`,
						"Declare the flow under `domain.flows` or update the expectation.",
					),
				);
			}

			const projectionId = asString(expectRecord.projection);
			if (projectionId !== undefined && !projectionIds.has(projectionId)) {
				diagnostics.push(
					referenceNotFound(
						`scenarios.${scenarioId}.steps.${stepIndex}.expect.projection`,
						`Scenario expectation references unknown projection \`${projectionId}\`.`,
						"Declare the projection under `domain.projections` or update the expectation.",
					),
				);
			}
		}
	}

	return diagnostics;
};
