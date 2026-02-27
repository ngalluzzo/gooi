import type { EffectKind } from "@gooi/capability-contracts/capability-port";
import type { PrincipalContext } from "@gooi/host-contracts/principal";
import type { SignalEnvelope } from "@gooi/surface-contracts/signal-envelope";
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
	DomainFlowGuardPlan,
	DomainGuardRuntime,
} from "./contracts";
import { buildFailureEnvelope } from "./failure-envelope";
import { evaluateDomainGuard } from "./guard-boundaries/evaluate-guards";
import { executeActionStep } from "./run-action-step";
import { buildSessionOutcome } from "./session-outcome";
import { appendActionTraceStep, createActionTrace } from "./trace";

interface RunMutationPathInput {
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

interface ActionRunState {
	trace: DomainTraceEnvelope;
	readonly stepOutputs: Record<string, unknown>;
	readonly observedEffects: EffectKind[];
	readonly emittedSignals: SignalEnvelope[];
}

const createActionRunState = (input: RunMutationPathInput): ActionRunState => ({
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

const failActionWithGuard = (
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

const applyActionBoundaryGuard = async (input: {
	readonly run: RunMutationPathInput;
	readonly state: ActionRunState;
	readonly boundary: "pre" | "post";
	readonly context: Readonly<Record<string, unknown>>;
}) => {
	const definition = input.run.action.guards?.[input.boundary];
	if (definition === undefined) {
		return { ok: true } as const;
	}
	const outcome = await evaluateDomainGuard({
		definition,
		context: input.context,
		mode: input.run.ctx.mode,
		now: input.run.ctx.now,
		...(input.run.guardRuntime === undefined
			? {}
			: { guardRuntime: input.run.guardRuntime }),
		fallbackCode: "action_guard_error",
	});
	input.state.emittedSignals.push(...outcome.emittedSignals);
	input.state.trace = appendActionTraceStep(input.state.trace, {
		stepId: `action.${input.boundary}_guard`,
		phase: "guard",
		status: outcome.ok ? "ok" : "error",
		detail: {
			boundary: "action",
			...outcome.detail,
		},
	});
	if (outcome.ok) {
		return { ok: true } as const;
	}
	return {
		ok: false,
		envelope: failActionWithGuard(
			input.run,
			input.state,
			outcome.error ?? {
				code: "action_guard_error",
				message: "Action guard blocked action execution.",
			},
		),
	} as const;
};

const applySignalGuards = async (input: {
	readonly run: RunMutationPathInput;
	readonly state: ActionRunState;
}) => {
	const guardBySignalId = new Map(
		(input.run.action.signalGuards ?? []).map((binding) => [
			binding.signalId,
			binding.definition,
		]),
	);
	const emittedSignals = [...input.state.emittedSignals];
	for (const signal of emittedSignals) {
		const guard = guardBySignalId.get(signal.signalId);
		if (guard === undefined) {
			continue;
		}
		const outcome = await evaluateDomainGuard({
			definition: guard,
			context: {
				input: input.run.input,
				steps: input.state.stepOutputs,
				signal,
				payload: signal.payload ?? {},
			},
			mode: input.run.ctx.mode,
			now: input.run.ctx.now,
			...(input.run.guardRuntime === undefined
				? {}
				: { guardRuntime: input.run.guardRuntime }),
			fallbackCode: "signal_guard_error",
		});
		input.state.emittedSignals.push(...outcome.emittedSignals);
		input.state.trace = appendActionTraceStep(input.state.trace, {
			stepId: `signal.${signal.signalId}`,
			phase: "guard",
			status: outcome.ok ? "ok" : "error",
			detail: {
				boundary: "signal",
				...outcome.detail,
			},
		});
		if (outcome.ok) {
			continue;
		}
		return {
			ok: false,
			envelope: failActionWithGuard(
				input.run,
				input.state,
				outcome.error ?? {
					code: "signal_guard_error",
					message: "Signal guard blocked signal dispatch.",
				},
			),
		} as const;
	}
	return { ok: true } as const;
};

const applyFlowGuard = async (input: {
	readonly run: RunMutationPathInput;
	readonly state: ActionRunState;
	readonly binding: DomainFlowGuardPlan;
}) => {
	const outcome = await evaluateDomainGuard({
		definition: input.binding.definition,
		context: {
			input: input.run.input,
			steps: input.state.stepOutputs,
			emittedSignals: input.state.emittedSignals,
		},
		mode: input.run.ctx.mode,
		now: input.run.ctx.now,
		...(input.run.guardRuntime === undefined
			? {}
			: { guardRuntime: input.run.guardRuntime }),
		fallbackCode: "flow_guard_error",
	});
	input.state.emittedSignals.push(...outcome.emittedSignals);
	input.state.trace = appendActionTraceStep(input.state.trace, {
		stepId: `flow.${input.binding.flowId}`,
		phase: "guard",
		status: outcome.ok ? "ok" : "error",
		detail: {
			boundary: "flow",
			...outcome.detail,
		},
	});
	if (outcome.ok) {
		return { ok: true } as const;
	}
	return {
		ok: false,
		envelope: failActionWithGuard(
			input.run,
			input.state,
			outcome.error ?? {
				code: "flow_guard_error",
				message: "Flow guard blocked action finalization.",
			},
		),
	} as const;
};

/**
 * Executes one action plan with deterministic step, session, and trace semantics.
 */
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
