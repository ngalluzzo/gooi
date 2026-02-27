import type { DomainFlowGuardPlan } from "./contracts";
import { evaluateDomainGuard } from "./guard-boundaries/evaluate-guards";
import type {
	ActionRunState,
	RunMutationPathInput,
} from "./run-mutation-state";
import { failActionWithGuard } from "./run-mutation-state";
import { appendActionTraceStep } from "./trace";

export const applyActionBoundaryGuard = async (input: {
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

export const applySignalGuards = async (input: {
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

export const applyFlowGuard = async (input: {
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
