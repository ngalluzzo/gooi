import type { CompiledEntrypoint } from "@gooi/app-spec-contracts/compiled";
import type { PrincipalContext } from "@gooi/host-contracts/principal";
import type {
	InvocationEnvelope,
	ResultEnvelope,
	TypedErrorEnvelope,
} from "@gooi/surface-contracts/envelope";
import { envelope } from "@gooi/surface-contracts/envelope";
import { calculateIsoDurationMs } from "../time/duration";

export const errorEnvelope = (
	code: string,
	message: string,
	retryable: boolean,
	details?: Readonly<Record<string, unknown>>,
): TypedErrorEnvelope<unknown> => ({
	envelopeVersion: envelope.surfaceEnvelopeVersion,
	code,
	message,
	retryable,
	...(details === undefined ? {} : { details }),
});

export const errorResult = (
	invocation: InvocationEnvelope<Readonly<Record<string, unknown>>>,
	artifactHash: string,
	startedAt: string,
	nowIso: () => string,
	error: TypedErrorEnvelope<unknown>,
): ResultEnvelope<unknown, unknown> => {
	const completedAt = nowIso();
	return {
		envelopeVersion: envelope.surfaceEnvelopeVersion,
		traceId: invocation.traceId,
		invocationId: invocation.invocationId,
		ok: false,
		error,
		emittedSignals: [],
		observedEffects: [],
		timings: {
			startedAt,
			completedAt,
			durationMs: calculateIsoDurationMs(startedAt, completedAt),
		},
		meta: {
			replayed: false,
			artifactHash,
			affectedQueryIds: [],
			refreshTriggers: [],
		},
	};
};

export const entrypointKey = (entrypoint: CompiledEntrypoint): string =>
	`${entrypoint.kind}:${entrypoint.id}`;

export const idempotencyScopeKey = (
	entrypoint: CompiledEntrypoint,
	principal: PrincipalContext,
	idempotencyKey: string,
): string =>
	`${entrypoint.kind}:${entrypoint.id}:${principal.subject ?? "anonymous"}:${idempotencyKey}`;
