import type { EffectKind } from "@gooi/capability-contracts/capability-port";
import { normalizeObservedEffects } from "../execution-core/effects/normalize-observed-effects";
import {
	type DomainQueryEnvelope,
	type DomainRuntimeMode,
	type DomainTraceEnvelope,
	domainRuntimeEnvelopeVersion,
} from "../execution-core/envelopes";
import type { DomainRuntimeTypedError } from "../execution-core/errors";

interface BuildQueryFailureEnvelopeInput {
	readonly mode: DomainRuntimeMode;
	readonly entrypointId: string;
	readonly error: DomainRuntimeTypedError;
	readonly trace: DomainTraceEnvelope;
	readonly observedEffects: readonly EffectKind[];
}

/**
 * Builds a typed query failure envelope with canonical observed-effects normalization.
 */
export const buildQueryFailureEnvelope = (
	input: BuildQueryFailureEnvelopeInput,
): DomainQueryEnvelope => ({
	envelopeVersion: domainRuntimeEnvelopeVersion,
	mode: input.mode,
	entrypointId: input.entrypointId,
	ok: false,
	error: input.error,
	observedEffects: normalizeObservedEffects(input.observedEffects),
	trace: input.trace,
});
