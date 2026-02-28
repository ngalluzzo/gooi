import type { EffectKind } from "@gooi/capability-contracts/capability-port";
import type { SignalEnvelope } from "@gooi/surface-contracts/envelope";
import { normalizeObservedEffects } from "../execution-core/effects/normalize-observed-effects";
import {
	type DomainMutationEnvelope,
	type DomainRuntimeMode,
	type DomainTraceEnvelope,
	domainRuntimeEnvelopeVersion,
} from "../execution-core/envelopes";
import type { DomainRuntimeTypedError } from "../execution-core/errors";
import type { DomainActionPlan } from "./contracts";
import { buildSessionOutcome } from "./session-outcome";
import { appendActionTraceStep } from "./trace";

interface BuildFailureEnvelopeInput {
	readonly entrypointId: string;
	readonly action: DomainActionPlan;
	readonly mode: DomainRuntimeMode;
	readonly trace: DomainTraceEnvelope;
	readonly error: DomainRuntimeTypedError;
	readonly effects: readonly EffectKind[];
	readonly emittedSignals: readonly SignalEnvelope[];
}

/**
 * Builds a typed failure envelope and appends deterministic session trace details.
 */
export const buildFailureEnvelope = (
	input: BuildFailureEnvelopeInput,
): DomainMutationEnvelope => {
	const sessionOutcome = buildSessionOutcome(input.action.session, "failure");
	const sessionTrace = appendActionTraceStep(input.trace, {
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
			mode: input.mode,
			entrypointId: input.entrypointId,
			actionId: input.action.actionId,
			ok: false,
			error: sessionOutcome.error,
			observedEffects: normalizeObservedEffects(input.effects),
			emittedSignals: input.emittedSignals,
			sessionOutcome: {
				envelopeVersion: domainRuntimeEnvelopeVersion,
				status: "skipped",
				reason: "no_policy",
			},
			trace: sessionTrace,
		};
	}

	return {
		envelopeVersion: domainRuntimeEnvelopeVersion,
		mode: input.mode,
		entrypointId: input.entrypointId,
		actionId: input.action.actionId,
		ok: false,
		error: input.error,
		observedEffects: normalizeObservedEffects(input.effects),
		emittedSignals: input.emittedSignals,
		sessionOutcome: sessionOutcome.value,
		trace: sessionTrace,
	};
};
