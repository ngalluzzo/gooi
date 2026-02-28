import type { EffectKind } from "@gooi/capability-contracts/capability-port";
import type { PrincipalContext } from "@gooi/host-contracts/principal";
import type { SignalEnvelope } from "@gooi/surface-contracts/envelope";
import { normalizeObservedEffects } from "../execution-core/effects/normalize-observed-effects";
import {
	type DomainMutationEnvelope,
	type DomainRuntimeMode,
	type DomainTraceEnvelope,
	domainRuntimeEnvelopeVersion,
} from "../execution-core/envelopes";
import type { DomainRuntimeTypedError } from "../execution-core/errors";
import type {
	DomainActionPlan,
	DomainCapabilityHandler,
	DomainGuardRuntime,
} from "./contracts";
import { buildFailureEnvelope } from "./failure-envelope";
import { buildSessionOutcome } from "./session-outcome";
import { appendActionTraceStep, createActionTrace } from "./trace";

export interface RunMutationPathInput {
	readonly entrypointId: string;
	readonly action: DomainActionPlan;
	readonly capabilities: Readonly<Record<string, DomainCapabilityHandler>>;
	readonly input: Readonly<Record<string, unknown>>;
	readonly principal: PrincipalContext;
	readonly guardRuntime?: DomainGuardRuntime;
	readonly ctx: {
		readonly invocationId: string;
		readonly traceId: string;
		readonly now: string;
		readonly mode: DomainRuntimeMode;
	};
}

export interface ActionRunState {
	trace: DomainTraceEnvelope;
	readonly stepOutputs: Record<string, unknown>;
	readonly observedEffects: EffectKind[];
	readonly emittedSignals: SignalEnvelope[];
}

export const createActionRunState = (
	input: RunMutationPathInput,
): ActionRunState => ({
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

export const buildSuccessEnvelope = (
	input: RunMutationPathInput,
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

export const failActionWithGuard = (
	input: RunMutationPathInput,
	state: ActionRunState,
	error: DomainRuntimeTypedError,
) =>
	buildFailureEnvelope({
		entrypointId: input.entrypointId,
		action: input.action,
		mode: input.ctx.mode,
		trace: state.trace,
		error,
		effects: state.observedEffects,
		emittedSignals: state.emittedSignals,
	});
