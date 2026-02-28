import type { AuthoringReadContext } from "../../contracts/read-context";
import {
	asRecord,
	asString,
	sourceSpecFlowIds,
	sourceSpecMutationIds,
	sourceSpecPersonaIds,
	sourceSpecProjectionIds,
	sourceSpecQueryIds,
	sourceSpecSignalIds,
} from "../../internal/source-spec";
import {
	type AuthoringDiagnostic,
	buildGuardScenarioDiagnostic,
	captureSourceSet,
} from "./guard-scenario-diagnostic-shared";

/**
 * Collects scenario/persona diagnostics from optional source spec content.
 */
export const collectScenarioDiagnostics = (
	context: AuthoringReadContext,
): AuthoringDiagnostic[] => {
	if (context.sourceSpec === undefined) {
		return [];
	}

	const diagnostics: AuthoringDiagnostic[] = [];
	const personas = new Set(sourceSpecPersonaIds(context.sourceSpec));
	const signals = new Set(sourceSpecSignalIds(context.sourceSpec));
	const flows = new Set(sourceSpecFlowIds(context.sourceSpec));
	const projections = new Set(sourceSpecProjectionIds(context.sourceSpec));
	const queries = new Set(sourceSpecQueryIds(context.sourceSpec));
	const mutations = new Set(sourceSpecMutationIds(context.sourceSpec));
	const scenarios = asRecord(asRecord(context.sourceSpec)?.scenarios) ?? {};

	for (const [scenarioId, scenarioValue] of Object.entries(scenarios).sort(
		([left], [right]) => left.localeCompare(right),
	)) {
		const scenario = asRecord(scenarioValue) ?? {};
		const personaId = asString(asRecord(scenario.context)?.persona);
		if (personaId !== undefined && !personas.has(personaId)) {
			diagnostics.push(
				buildGuardScenarioDiagnostic({
					context,
					code: "scenario_persona_unknown",
					path: `scenarios.${scenarioId}.context.persona`,
					message: `Scenario references unknown persona '${personaId}'.`,
					token: personaId,
					hint: "Use one of the declared persona ids from `personas`.",
				}),
			);
		}

		const steps = Array.isArray(scenario.steps) ? scenario.steps : [];
		for (let stepIndex = 0; stepIndex < steps.length; stepIndex += 1) {
			const step = asRecord(steps[stepIndex]) ?? {};
			const capture = Array.isArray(step.capture) ? step.capture : [];
			for (
				let captureIndex = 0;
				captureIndex < capture.length;
				captureIndex += 1
			) {
				const binding = asRecord(capture[captureIndex]) ?? {};
				const source = asString(binding.source) ?? asString(binding.from);
				const path = asString(binding.path);
				if (source !== undefined && !captureSourceSet.has(source)) {
					diagnostics.push(
						buildGuardScenarioDiagnostic({
							context,
							code: "scenario_capture_source_invalid",
							path: `scenarios.${scenarioId}.steps.${stepIndex}.capture.${captureIndex}.source`,
							message: `Capture source '${source}' is not supported.`,
							token: source,
							hint: "Use one of: last_trigger_output, last_signal_payload, last_expectation_output, context.",
						}),
					);
				}
				if (path === undefined) {
					diagnostics.push(
						buildGuardScenarioDiagnostic({
							context,
							code: "scenario_capture_path_invalid",
							path: `scenarios.${scenarioId}.steps.${stepIndex}.capture.${captureIndex}.path`,
							message: "Capture binding requires a non-empty path.",
							token: "capture",
							hint: "Set `path` to a valid runtime payload path.",
						}),
					);
				}
			}

			const trigger = asRecord(step.trigger);
			const mutationId = asString(trigger?.mutation);
			const queryId = asString(trigger?.query);
			if (mutationId !== undefined && !mutations.has(mutationId)) {
				diagnostics.push(
					buildGuardScenarioDiagnostic({
						context,
						code: "scenario_reference_unknown",
						path: `scenarios.${scenarioId}.steps.${stepIndex}.trigger.mutation`,
						message: `Trigger references unknown mutation '${mutationId}'.`,
						token: mutationId,
						hint: "Use a declared mutation id from `mutations`.",
					}),
				);
			}
			if (queryId !== undefined && !queries.has(queryId)) {
				diagnostics.push(
					buildGuardScenarioDiagnostic({
						context,
						code: "scenario_reference_unknown",
						path: `scenarios.${scenarioId}.steps.${stepIndex}.trigger.query`,
						message: `Trigger references unknown query '${queryId}'.`,
						token: queryId,
						hint: "Use a declared query id from `queries`.",
					}),
				);
			}

			const expect = asRecord(step.expect);
			const signalId = asString(expect?.signal);
			const flowId =
				asString(expect?.flow_completed) ?? asString(expect?.flowCompleted);
			const projectionId = asString(expect?.projection);
			if (signalId !== undefined && !signals.has(signalId)) {
				diagnostics.push(
					buildGuardScenarioDiagnostic({
						context,
						code: "scenario_reference_unknown",
						path: `scenarios.${scenarioId}.steps.${stepIndex}.expect.signal`,
						message: `Expect step references unknown signal '${signalId}'.`,
						token: signalId,
						hint: "Use a declared signal id from `domain.signals`.",
					}),
				);
			}
			if (flowId !== undefined && !flows.has(flowId)) {
				diagnostics.push(
					buildGuardScenarioDiagnostic({
						context,
						code: "scenario_reference_unknown",
						path: `scenarios.${scenarioId}.steps.${stepIndex}.expect.flow_completed`,
						message: `Expect step references unknown flow '${flowId}'.`,
						token: flowId,
						hint: "Use a declared flow id from `domain.flows`.",
					}),
				);
			}
			if (projectionId !== undefined && !projections.has(projectionId)) {
				diagnostics.push(
					buildGuardScenarioDiagnostic({
						context,
						code: "scenario_reference_unknown",
						path: `scenarios.${scenarioId}.steps.${stepIndex}.expect.projection`,
						message: `Expect step references unknown projection '${projectionId}'.`,
						token: projectionId,
						hint: "Use a declared projection id from `domain.projections`.",
					}),
				);
			}
		}
	}

	return diagnostics;
};
