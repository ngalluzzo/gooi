import { createDomainRuntimeError } from "../../execution-core/errors";
import type {
	ExecuteActionStepInput,
	ExecuteActionStepResult,
	MutableActionState,
} from "../action-step-types";
import type {
	DomainCapabilityHandler,
	DomainCapabilityInvocationResult,
} from "../contracts";
import { sanitizeSimulationEffects } from "../effects";
import { buildFailureEnvelope } from "../failure-envelope";
import { appendActionTraceStep } from "../trace";

const failStep = (
	input: ExecuteActionStepInput,
	error: Parameters<typeof buildFailureEnvelope>[0]["error"],
): ExecuteActionStepResult => ({
	ok: false,
	envelope: buildFailureEnvelope({
		entrypointId: input.entrypointId,
		action: input.action,
		mode: input.mode,
		trace: input.state.trace,
		error,
		effects: input.state.observedEffects,
		emittedSignals: input.state.emittedSignals,
	}),
});

const invokeCapability = async (
	mode: ExecuteActionStepInput["mode"],
	capability: DomainCapabilityHandler,
	invocationInput: {
		readonly input: Readonly<Record<string, unknown>>;
		readonly principal: ExecuteActionStepInput["principal"];
		readonly ctx: ExecuteActionStepInput["ctx"];
	},
): Promise<DomainCapabilityInvocationResult> => {
	const invoke =
		mode === "simulation" && capability.simulate
			? capability.simulate
			: capability.invoke;
	return invoke({
		capabilityId: capability.capabilityId,
		input: invocationInput.input,
		principal: invocationInput.principal,
		ctx: invocationInput.ctx,
	});
};

export const executeCapabilityInvocation = async ({
	input,
	resolvedInput,
	capability,
}: {
	readonly input: ExecuteActionStepInput;
	readonly resolvedInput: Readonly<Record<string, unknown>>;
	readonly capability: DomainCapabilityHandler;
}): Promise<ExecuteActionStepResult> => {
	const state = input.state as MutableActionState;
	if (input.mode === "simulation" && capability.simulate === undefined) {
		state.trace = appendActionTraceStep(state.trace, {
			stepId: input.step.stepId,
			capabilityId: input.step.capabilityId,
			phase: "invoke",
			status: "skipped",
			detail: { reason: "simulation_no_handler" },
		});
		state.stepOutputs[input.step.stepId] = undefined;
		return { ok: true };
	}

	let result: DomainCapabilityInvocationResult;
	try {
		result = await invokeCapability(input.mode, capability, {
			input: resolvedInput,
			principal: input.principal,
			ctx: input.ctx,
		});
	} catch (error) {
		state.trace = appendActionTraceStep(state.trace, {
			stepId: input.step.stepId,
			capabilityId: input.step.capabilityId,
			phase: "invoke",
			status: "error",
			detail: {
				error:
					error instanceof Error
						? { name: error.name, message: error.message }
						: { value: String(error) },
			},
		});
		return failStep(
			input,
			createDomainRuntimeError(
				"capability_invocation_error",
				"Capability invocation threw before returning a typed result.",
				{ stepId: input.step.stepId, capabilityId: input.step.capabilityId },
			),
		);
	}

	if (!result.ok) {
		state.trace = appendActionTraceStep(state.trace, {
			stepId: input.step.stepId,
			capabilityId: input.step.capabilityId,
			phase: "invoke",
			status: "error",
			detail: { error: result.error },
		});
		return failStep(
			input,
			createDomainRuntimeError(
				"capability_invocation_error",
				"Capability invocation returned a failed typed result.",
				{
					stepId: input.step.stepId,
					capabilityId: input.step.capabilityId,
					error: result.error,
				},
			),
		);
	}

	state.trace = appendActionTraceStep(state.trace, {
		stepId: input.step.stepId,
		capabilityId: input.step.capabilityId,
		phase: "invoke",
		status: "ok",
	});
	state.stepOutputs[input.step.stepId] = result.output;
	state.observedEffects.push(
		...(input.mode === "simulation"
			? sanitizeSimulationEffects(result.observedEffects)
			: result.observedEffects),
	);
	if (result.emittedSignals) {
		state.emittedSignals.push(...result.emittedSignals);
	}
	return { ok: true };
};
