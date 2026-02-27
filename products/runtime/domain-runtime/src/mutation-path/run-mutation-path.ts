import type { DomainMutationEnvelope } from "../execution-core/envelopes";
import { executeActionStep } from "./run-action-step";
import {
	applyActionBoundaryGuard,
	applyFlowGuard,
	applySignalGuards,
} from "./run-mutation-helpers";
import {
	buildSuccessEnvelope,
	createActionRunState,
	type RunMutationPathInput,
} from "./run-mutation-state";

export const runMutationPath = async (
	input: RunMutationPathInput,
): Promise<DomainMutationEnvelope> => {
	const state = createActionRunState(input);

	const pre = await applyActionBoundaryGuard({
		run: input,
		state,
		boundary: "pre",
		context: {
			input: input.input,
			principal: input.principal,
			ctx: input.ctx,
		},
	});
	if (!pre.ok) {
		return pre.envelope;
	}

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
			return result.envelope;
		}
	}

	const post = await applyActionBoundaryGuard({
		run: input,
		state,
		boundary: "post",
		context: {
			input: input.input,
			steps: state.stepOutputs,
			emittedSignals: state.emittedSignals,
			principal: input.principal,
			ctx: input.ctx,
		},
	});
	if (!post.ok) {
		return post.envelope;
	}

	const signals = await applySignalGuards({ run: input, state });
	if (!signals.ok) {
		return signals.envelope;
	}

	for (const binding of input.action.flowGuards ?? []) {
		const flow = await applyFlowGuard({
			run: input,
			state,
			binding,
		});
		if (!flow.ok) {
			return flow.envelope;
		}
	}

	return buildSuccessEnvelope(input, state);
};
