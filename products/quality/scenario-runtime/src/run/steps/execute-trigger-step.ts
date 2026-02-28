import { errorsContracts } from "@gooi/scenario-contracts/errors";
import type {
	CompiledPersonaDefinition,
	CompiledScenarioPlan,
	ScenarioGeneratedInputLockSnapshot,
} from "@gooi/scenario-contracts/plans";
import { generateTriggerInput } from "../../persona/generate-trigger-input";
import { applyCaptureBindings } from "../capture-bindings";
import type {
	MutableScenarioGeneratedInputLockSnapshot,
	RunScenarioInput,
	RuntimeState,
	StepExecutionResult,
} from "../contracts";
import { makeStepResult } from "../step-result";
import { resolveTriggerInput } from "../trigger-input";

export const executeTriggerStep = async (input: {
	readonly runInput: RunScenarioInput;
	readonly scenario: CompiledScenarioPlan;
	readonly stepIndex: number;
	readonly state: RuntimeState;
	readonly persona?: CompiledPersonaDefinition;
	readonly lockBase: ScenarioGeneratedInputLockSnapshot;
	readonly lockDraft: MutableScenarioGeneratedInputLockSnapshot;
	readonly refreshGenerated: boolean;
}): Promise<StepExecutionResult> => {
	const step = input.scenario.steps[input.stepIndex];
	if (step?.kind !== "trigger") {
		throw new Error("executeTriggerStep requires a trigger step.");
	}

	const resolvedInput = resolveTriggerInput({
		scenario: input.scenario,
		stepIndex: input.stepIndex,
		trigger: step.trigger,
		...(input.persona === undefined ? {} : { persona: input.persona }),
		captures: input.state.captures,
		lockSnapshot: input.lockBase,
		refreshGenerated: input.refreshGenerated,
		generateInput: input.runInput.generateInput ?? generateTriggerInput,
	});
	if (!resolvedInput.ok) {
		const error = errorsContracts.createScenarioError(
			"scenario_capture_error",
			"Scenario trigger input resolution failed due to missing capture.",
			input.scenario.scenarioId,
			input.stepIndex,
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

	const result = await input.runInput.invokeEntrypoint({
		entrypointKind: step.trigger.entrypointKind,
		entrypointId: step.trigger.entrypointId,
		input: resolvedInput.input,
		context: {
			...(input.runInput.profile === undefined
				? {}
				: { profile: input.runInput.profile }),
			...(input.runInput.environment === undefined
				? {}
				: { environment: input.runInput.environment }),
			...(input.scenario.context.principal === undefined
				? {}
				: { principal: input.scenario.context.principal }),
			...(input.scenario.context.session === undefined
				? {}
				: { session: input.scenario.context.session }),
			...(input.persona === undefined ? {} : { persona: input.persona }),
			...(input.scenario.context.providerOverrides === undefined
				? {}
				: { providerOverrides: input.scenario.context.providerOverrides }),
		},
	});
	input.state.lastTrigger = result;
	delete input.state.lastExpectation;
	for (const emitted of result.emittedSignals ?? []) {
		input.state.emittedSignals.push(emitted);
	}

	if (
		step.trigger.generate === true &&
		resolvedInput.generatedInput !== undefined
	) {
		const generatedByScenario = input.lockDraft.generated;
		const existing = generatedByScenario[input.scenario.scenarioId] ?? {};
		generatedByScenario[input.scenario.scenarioId] = {
			...existing,
			[input.stepIndex]: resolvedInput.generatedInput,
		};
	}

	if (!result.ok) {
		const error = errorsContracts.createScenarioError(
			"scenario_trigger_error",
			"Scenario trigger invocation failed.",
			input.scenario.scenarioId,
			input.stepIndex,
			{ error: result.error },
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

	if (step.capture !== undefined) {
		const capture = applyCaptureBindings({
			bindings: step.capture,
			state: input.state,
			context: input.scenario.context,
		});
		if (!capture.ok) {
			const error = errorsContracts.createScenarioError(
				"scenario_capture_error",
				"Scenario trigger capture failed.",
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
