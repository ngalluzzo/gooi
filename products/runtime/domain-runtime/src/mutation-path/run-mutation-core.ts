import type {
	KernelSemanticMutationCoreResult,
	KernelSemanticMutationPreparationResult,
	KernelSemanticSignalGuardCheckpoint,
} from "@gooi/kernel-contracts/semantic-engine";
import { normalizeObservedEffects } from "../execution-core/effects/normalize-observed-effects";
import { executeActionStep } from "./run-action-step";
import {
	createActionRunState,
	type RunMutationPathInput,
} from "./run-mutation-state";

/**
 * Builds the pre-step guard checkpoint consumed by kernel-owned guard orchestration.
 */
export const prepareDomainMutation = (
	input: RunMutationPathInput,
): KernelSemanticMutationPreparationResult => ({
	ok: true,
	actionId: input.action.actionId,
	observedEffects: [],
	emittedSignals: [],
	...(input.action.guards?.pre === undefined
		? {}
		: {
				preGuard: {
					definition: input.action.guards.pre,
					context: {
						input: input.input,
						principal: input.principal,
						ctx: input.ctx,
					},
				},
			}),
	...(input.guardRuntime === undefined
		? {}
		: {
				guardRuntime: {
					...(input.guardRuntime.policyPlan === undefined
						? {}
						: { policyPlan: input.guardRuntime.policyPlan }),
					...(input.guardRuntime.semanticJudge === undefined
						? {}
						: { semanticJudge: input.guardRuntime.semanticJudge }),
				},
			}),
});

const buildSignalGuardCheckpoints = (
	input: RunMutationPathInput,
	stepOutputs: Readonly<Record<string, unknown>>,
	emittedSignals: readonly KernelSemanticSignalGuardCheckpoint["signal"][],
): readonly KernelSemanticSignalGuardCheckpoint[] => {
	const guardBySignalId = new Map(
		(input.action.signalGuards ?? []).map((binding) => [
			binding.signalId,
			binding.definition,
		]),
	);
	return emittedSignals.flatMap((signal) => {
		const definition = guardBySignalId.get(signal.signalId);
		if (definition === undefined) {
			return [];
		}
		return [
			{
				signal,
				definition,
				context: {
					input: input.input,
					steps: stepOutputs,
					signal,
					payload: signal.payload ?? {},
				},
			},
		];
	});
};

/**
 * Executes mutation steps/invariants without action/signal/flow guard policy sequencing.
 */
export const executeDomainMutationCore = async (
	input: RunMutationPathInput,
): Promise<KernelSemanticMutationCoreResult> => {
	const state = createActionRunState(input);
	for (const step of input.action.steps) {
		const result = await executeActionStep({
			entrypointId: input.entrypointId,
			action: input.action,
			step,
			mode: input.ctx.mode,
			capabilities: input.capabilities,
			runtimeInput: input.input,
			principal: input.principal,
			ctx: input.ctx,
			state,
		});
		if (!result.ok) {
			return {
				ok: false,
				actionId: input.action.actionId,
				stepOutputs: state.stepOutputs,
				error: result.envelope.error,
				observedEffects: result.envelope.observedEffects,
				emittedSignals: result.envelope.emittedSignals,
			};
		}
	}

	const signalGuards = buildSignalGuardCheckpoints(
		input,
		state.stepOutputs,
		state.emittedSignals,
	);
	return {
		ok: true,
		actionId: input.action.actionId,
		output: { steps: state.stepOutputs },
		stepOutputs: state.stepOutputs,
		observedEffects: normalizeObservedEffects(state.observedEffects),
		emittedSignals: state.emittedSignals,
		...(input.action.guards?.post === undefined
			? {}
			: {
					postGuard: {
						definition: input.action.guards.post,
						context: {
							input: input.input,
							steps: state.stepOutputs,
							emittedSignals: state.emittedSignals,
							principal: input.principal,
							ctx: input.ctx,
						},
					},
				}),
		...(signalGuards.length === 0 ? {} : { signalGuards }),
		...(input.action.flowGuards === undefined
			? {}
			: {
					flowGuards: input.action.flowGuards.map((binding) => ({
						flowId: binding.flowId,
						definition: binding.definition,
						context: {
							input: input.input,
							steps: state.stepOutputs,
							emittedSignals: state.emittedSignals,
						},
					})),
				}),
	};
};
