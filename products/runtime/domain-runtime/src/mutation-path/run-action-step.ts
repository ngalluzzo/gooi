import { createDomainRuntimeError } from "../execution-core/errors";
import { executeCapabilityInvocation } from "./action-step/invoke-capability-step";
import type {
	ExecuteActionStepInput,
	ExecuteActionStepResult,
} from "./action-step-types";
import { buildFailureEnvelope } from "./failure-envelope";
import { evaluateDomainInvariant } from "./guard-boundaries/evaluate-guards";
import { resolveStepInput } from "./resolve-step-input";
import { appendActionTraceStep } from "./trace";
import { validateCapabilityInput } from "./validate-capability-input";

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

/**
 * Executes one deterministic action step and mutates shared run state.
 */
export const executeActionStep = async (
	input: ExecuteActionStepInput,
): Promise<ExecuteActionStepResult> => {
	const resolvedInput = resolveStepInput(
		input.step.stepId,
		input.step.input,
		input.runtimeInput,
	);
	if (!resolvedInput.ok) {
		input.state.trace = appendActionTraceStep(input.state.trace, {
			stepId: input.step.stepId,
			capabilityId: input.step.capabilityId,
			phase: "resolve_input",
			status: "error",
			detail: resolvedInput.error.details,
		});
		return failStep(input, resolvedInput.error);
	}
	input.state.trace = appendActionTraceStep(input.state.trace, {
		stepId: input.step.stepId,
		capabilityId: input.step.capabilityId,
		phase: "resolve_input",
		status: "ok",
	});

	for (const invariant of input.step.invariants ?? []) {
		const invariantOutcome = evaluateDomainInvariant({
			definition: invariant,
			context: resolvedInput.value,
			now: input.ctx.now,
		});
		input.state.emittedSignals.push(...invariantOutcome.emittedSignals);
		input.state.trace = appendActionTraceStep(input.state.trace, {
			stepId: input.step.stepId,
			capabilityId: input.step.capabilityId,
			phase: "guard",
			status: invariantOutcome.ok ? "ok" : "error",
			detail: {
				boundary: "collection_invariant",
				...invariantOutcome.detail,
			},
		});
		if (!invariantOutcome.ok) {
			return failStep(
				input,
				invariantOutcome.error ??
					createDomainRuntimeError(
						"collection_invariant_error",
						"Collection invariant blocked action step execution.",
						{
							stepId: input.step.stepId,
							capabilityId: input.step.capabilityId,
						},
					),
			);
		}
	}

	const capability = input.capabilities[input.step.capabilityId];
	if (capability === undefined) {
		input.state.trace = appendActionTraceStep(input.state.trace, {
			stepId: input.step.stepId,
			capabilityId: input.step.capabilityId,
			phase: "validate_contract",
			status: "error",
			detail: { code: "capability_not_bound" },
		});
		return failStep(
			input,
			createDomainRuntimeError(
				"capability_contract_error",
				"Action step references an unknown capability.",
				{ stepId: input.step.stepId, capabilityId: input.step.capabilityId },
			),
		);
	}

	const contractValidation = validateCapabilityInput(
		input.step.stepId,
		input.step.capabilityId,
		resolvedInput.value,
		capability.contract,
	);
	if (!contractValidation.ok) {
		input.state.trace = appendActionTraceStep(input.state.trace, {
			stepId: input.step.stepId,
			capabilityId: input.step.capabilityId,
			phase: "validate_contract",
			status: "error",
			detail: contractValidation.error.details,
		});
		return failStep(input, contractValidation.error);
	}
	input.state.trace = appendActionTraceStep(input.state.trace, {
		stepId: input.step.stepId,
		capabilityId: input.step.capabilityId,
		phase: "validate_contract",
		status: "ok",
	});

	return executeCapabilityInvocation({
		input,
		resolvedInput: resolvedInput.value,
		capability,
	});
};
