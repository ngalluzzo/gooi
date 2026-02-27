import { evaluateGuard } from "@gooi/guard-runtime/evaluate";
import { createScenarioError } from "@gooi/scenario-contracts/errors/scenario-errors";
import type {
	CompiledPersonaDefinition,
	CompiledScenarioPlan,
} from "@gooi/scenario-contracts/plans/scenario-plan";
import type {
	RunScenarioInput,
	RuntimeState,
	StepExecutionResult,
} from "../contracts";
import { makeStepResult } from "../step-result";

const resolveExpectation = async (input: {
	readonly runInput: RunScenarioInput;
	readonly scenario: CompiledScenarioPlan;
	readonly stepIndex: number;
	readonly state: RuntimeState;
	readonly persona?: CompiledPersonaDefinition;
}): Promise<Readonly<Record<string, unknown>> | null> => {
	const step = input.scenario.steps[input.stepIndex];
	if (step?.kind !== "expect") {
		throw new Error("resolveExpectation requires an expect step.");
	}
	const expectation = step.expect;
	if (expectation.kind === "signal") {
		return (
			input.state.emittedSignals
				.slice()
				.reverse()
				.find((signal) => signal.signalId === expectation.signalId) ?? null
		);
	}
	if (expectation.kind === "query") {
		const queryResult = await input.runInput.invokeEntrypoint({
			entrypointKind: "query",
			entrypointId: expectation.queryId,
			input: expectation.args ?? {},
			context: {
				...(input.scenario.context.principal === undefined
					? {}
					: { principal: input.scenario.context.principal }),
				...(input.scenario.context.session === undefined
					? {}
					: { session: input.scenario.context.session }),
				...(input.persona === undefined ? {} : { persona: input.persona }),
			},
		});
		return {
			result: queryResult,
			output: queryResult.output,
			rows: Array.isArray(queryResult.output)
				? queryResult.output
				: (queryResult.output as Readonly<Record<string, unknown>>)?.rows,
		};
	}
	if (expectation.kind === "flow") {
		if (input.runInput.resolveFlowCompletion === undefined) {
			return null;
		}
		return input.runInput.resolveFlowCompletion({
			flowId: expectation.flowId,
			context: input.scenario.context,
		});
	}
	if (input.runInput.resolveProjection === undefined) {
		return null;
	}
	return input.runInput.resolveProjection({
		projectionId: expectation.projectionId,
		args: expectation.args ?? {},
		context: input.scenario.context,
	});
};

export const executeExpectStep = async (input: {
	readonly runInput: RunScenarioInput;
	readonly scenario: CompiledScenarioPlan;
	readonly stepIndex: number;
	readonly state: RuntimeState;
	readonly persona?: CompiledPersonaDefinition;
}): Promise<StepExecutionResult> => {
	const step = input.scenario.steps[input.stepIndex];
	if (step?.kind !== "expect") {
		throw new Error("executeExpectStep requires an expect step.");
	}

	const expectation = await resolveExpectation(input);
	if (expectation === null) {
		const error = createScenarioError(
			"scenario_expectation_error",
			"Scenario expectation target was not satisfied.",
			input.scenario.scenarioId,
			input.stepIndex,
			{ target: step.expect.kind },
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

	input.state.lastExpectation = expectation;
	if (step.guard !== undefined) {
		const guard = await evaluateGuard({
			definition: step.guard,
			context: expectation,
			environment: input.runInput.environment ?? "simulation",
			...(input.runInput.semanticJudge === undefined
				? {}
				: { semanticJudge: input.runInput.semanticJudge }),
			samplingSeed: `${input.scenario.scenarioId}:${input.stepIndex}`,
		});
		if (!guard.ok) {
			const error = createScenarioError(
				"scenario_guard_error",
				"Scenario expectation guard failed.",
				input.scenario.scenarioId,
				input.stepIndex,
				{ error: guard.error, violations: guard.violations },
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
