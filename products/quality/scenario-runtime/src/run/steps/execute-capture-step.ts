import { createScenarioError } from "@gooi/scenario-contracts/errors/scenario-errors";
import type { CompiledScenarioPlan } from "@gooi/scenario-contracts/plans/scenario-plan";
import { applyCaptureBindings } from "../capture-bindings";
import type {
	RunScenarioInput,
	RuntimeState,
	StepExecutionResult,
} from "../contracts";
import { makeStepResult } from "../step-result";

export const executeCaptureStep = (input: {
	readonly runInput: RunScenarioInput;
	readonly scenario: CompiledScenarioPlan;
	readonly stepIndex: number;
	readonly state: RuntimeState;
}): StepExecutionResult => {
	const step = input.scenario.steps[input.stepIndex];
	if (step?.kind !== "capture") {
		throw new Error("executeCaptureStep requires a capture step.");
	}

	const capture = applyCaptureBindings({
		bindings: step.capture,
		state: input.state,
		context: input.scenario.context,
	});
	if (!capture.ok) {
		const error = createScenarioError(
			"scenario_capture_error",
			"Scenario capture step failed.",
			input.scenario.scenarioId,
			input.stepIndex,
			{ captureId: capture.captureId },
		);
		return {
			ok: false,
			error,
			stepResult: makeStepResult({
				scenarioId: input.scenario.scenarioId,
				stepIndex: input.stepIndex,
				step,
				traceId: input.runInput.traceId,
				invocationId: input.runInput.invocationId,
				captures: input.state.captures,
				ok: false,
				error,
			}),
		};
	}

	return {
		ok: true,
		stepResult: makeStepResult({
			scenarioId: input.scenario.scenarioId,
			stepIndex: input.stepIndex,
			step,
			traceId: input.runInput.traceId,
			invocationId: input.runInput.invocationId,
			captures: input.state.captures,
			ok: true,
		}),
	};
};
