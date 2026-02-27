import type { EffectKind } from "@gooi/capability-contracts/capability-port";
import type { PrincipalContext } from "@gooi/host-contracts/principal";
import type { SignalEnvelope } from "@gooi/surface-contracts/signal-envelope";
import type {
	DomainMutationEnvelope,
	DomainRuntimeMode,
	DomainTraceEnvelope,
} from "../execution-core/envelopes";
import { createDomainRuntimeError } from "../execution-core/errors";
import type {
	DomainActionPlan,
	DomainActionStepPlan,
	DomainCapabilityHandler,
	DomainCapabilityInvocationResult,
} from "./contracts";
import { sanitizeSimulationEffects } from "./effects";
import { buildFailureEnvelope } from "./failure-envelope";
import { evaluateDomainInvariant } from "./guard-boundaries/evaluate-guards";
import { resolveStepInput } from "./resolve-step-input";
import { appendActionTraceStep } from "./trace";
import { validateCapabilityInput } from "./validate-capability-input";

interface MutableActionState {
	trace: DomainTraceEnvelope;
	readonly stepOutputs: Record<string, unknown>;
	readonly observedEffects: EffectKind[];
	readonly emittedSignals: SignalEnvelope[];
}

interface ExecuteActionStepInput {
	readonly entrypointId: string;
	readonly action: DomainActionPlan;
	readonly step: DomainActionStepPlan;
	readonly mode: DomainRuntimeMode;
	readonly capabilities: Readonly<Record<string, DomainCapabilityHandler>>;
	readonly runtimeInput: Readonly<Record<string, unknown>>;
	readonly principal: PrincipalContext;
	readonly ctx: {
		readonly invocationId: string;
		readonly traceId: string;
		readonly now: string;
		readonly mode: DomainRuntimeMode;
	};
	readonly state: MutableActionState;
}

export type ExecuteActionStepResult =
	| { readonly ok: true }
	| { readonly ok: false; readonly envelope: DomainMutationEnvelope };

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
	mode: DomainRuntimeMode,
	capability: DomainCapabilityHandler,
	invocationInput: {
		readonly input: Readonly<Record<string, unknown>>;
		readonly principal: PrincipalContext;
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

	if (input.mode === "simulation" && capability.simulate === undefined) {
		input.state.trace = appendActionTraceStep(input.state.trace, {
			stepId: input.step.stepId,
			capabilityId: input.step.capabilityId,
			phase: "invoke",
			status: "skipped",
			detail: { reason: "simulation_no_handler" },
		});
		input.state.stepOutputs[input.step.stepId] = undefined;
		return { ok: true };
	}

	let result: DomainCapabilityInvocationResult;
	try {
		result = await invokeCapability(input.mode, capability, {
			input: resolvedInput.value,
			principal: input.principal,
			ctx: input.ctx,
		});
	} catch (error) {
		input.state.trace = appendActionTraceStep(input.state.trace, {
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
		input.state.trace = appendActionTraceStep(input.state.trace, {
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

	input.state.trace = appendActionTraceStep(input.state.trace, {
		stepId: input.step.stepId,
		capabilityId: input.step.capabilityId,
		phase: "invoke",
		status: "ok",
	});
	input.state.stepOutputs[input.step.stepId] = result.output;
	input.state.observedEffects.push(
		...(input.mode === "simulation"
			? sanitizeSimulationEffects(result.observedEffects)
			: result.observedEffects),
	);
	if (result.emittedSignals) {
		input.state.emittedSignals.push(...result.emittedSignals);
	}
	return { ok: true };
};
