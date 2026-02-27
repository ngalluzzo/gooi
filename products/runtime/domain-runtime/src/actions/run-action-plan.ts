import type { EffectKind } from "@gooi/capability-contracts/capability-port";
import type { PrincipalContext } from "@gooi/host-contracts/principal";
import type { SignalEnvelope } from "@gooi/surface-contracts/signal-envelope";
import type {
	DomainActionPlan,
	DomainCapabilityHandler,
} from "../contracts/action-plan";
import {
	type DomainMutationEnvelope,
	type DomainRuntimeMode,
	type DomainTraceEnvelope,
	domainRuntimeEnvelopeVersion,
} from "../contracts/envelopes";
import { normalizeObservedEffects } from "./effects";
import { executeActionStep } from "./execute-action-step";
import { buildSessionOutcome } from "./session-outcome";
import { appendActionTraceStep, createActionTrace } from "./trace";

interface RunActionPlanInput {
	readonly entrypointId: string;
	readonly action: DomainActionPlan;
	readonly capabilities: Readonly<Record<string, DomainCapabilityHandler>>;
	readonly input: Readonly<Record<string, unknown>>;
	readonly principal: PrincipalContext;
	readonly ctx: {
		readonly invocationId: string;
		readonly traceId: string;
		readonly now: string;
		readonly mode: DomainRuntimeMode;
	};
}

interface ActionRunState {
	trace: DomainTraceEnvelope;
	readonly stepOutputs: Record<string, unknown>;
	readonly observedEffects: EffectKind[];
	readonly emittedSignals: SignalEnvelope[];
}

const createActionRunState = (input: RunActionPlanInput): ActionRunState => ({
	trace: createActionTrace({
		mode: input.ctx.mode,
		entrypointId: input.entrypointId,
		actionId: input.action.actionId,
		invocationId: input.ctx.invocationId,
		traceId: input.ctx.traceId,
	}),
	stepOutputs: {},
	observedEffects: [],
	emittedSignals: [],
});

const buildSuccessEnvelope = (
	input: RunActionPlanInput,
	state: ActionRunState,
): DomainMutationEnvelope => {
	const sessionOutcome = buildSessionOutcome(input.action.session, "success");
	state.trace = appendActionTraceStep(state.trace, {
		stepId: "session.outcome",
		phase: "session",
		status: sessionOutcome.ok ? "ok" : "error",
		...(sessionOutcome.ok
			? { detail: { status: sessionOutcome.value.status } }
			: { detail: sessionOutcome.error.details }),
	});
	if (!sessionOutcome.ok) {
		return {
			envelopeVersion: domainRuntimeEnvelopeVersion,
			mode: input.ctx.mode,
			entrypointId: input.entrypointId,
			actionId: input.action.actionId,
			ok: false,
			error: sessionOutcome.error,
			observedEffects: normalizeObservedEffects(state.observedEffects),
			emittedSignals: state.emittedSignals,
			sessionOutcome: {
				envelopeVersion: domainRuntimeEnvelopeVersion,
				status: "skipped",
				reason: "no_policy",
			},
			trace: state.trace,
		};
	}

	return {
		envelopeVersion: domainRuntimeEnvelopeVersion,
		mode: input.ctx.mode,
		entrypointId: input.entrypointId,
		actionId: input.action.actionId,
		ok: true,
		output: { steps: state.stepOutputs },
		observedEffects: normalizeObservedEffects(state.observedEffects),
		emittedSignals: state.emittedSignals,
		sessionOutcome: sessionOutcome.value,
		trace: state.trace,
	};
};

/**
 * Executes one action plan with deterministic step, session, and trace semantics.
 */
export const runActionPlan = async (
	input: RunActionPlanInput,
): Promise<DomainMutationEnvelope> => {
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
			return result.envelope;
		}
	}
	return buildSuccessEnvelope(input, state);
};
