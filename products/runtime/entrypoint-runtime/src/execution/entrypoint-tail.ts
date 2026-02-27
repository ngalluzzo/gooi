import type { CompiledEntrypoint } from "@gooi/app-spec-contracts/compiled";
import type { EffectKind } from "@gooi/capability-contracts/capability-port";
import type { PrincipalContext } from "@gooi/host-contracts/principal";
import { surfaceEnvelopeVersion } from "@gooi/surface-contracts/envelope-version";
import type { ResultEnvelope } from "@gooi/surface-contracts/result-envelope";
import type { SignalEnvelope } from "@gooi/surface-contracts/signal-envelope";
import type { DomainRuntimePort } from "../domain";
import {
	buildRefreshTriggers,
	resolveAffectedQueryIds,
} from "../refresh/refresh";
import { calculateIsoDurationMs } from "../timing/duration";

const envelopeVersion = surfaceEnvelopeVersion;

interface ExecuteTailInput {
	readonly entrypoint: CompiledEntrypoint;
	readonly invocation: {
		readonly traceId: string;
		readonly invocationId: string;
		readonly principal: PrincipalContext;
		readonly input: Readonly<Record<string, unknown>>;
		readonly meta: { readonly idempotencyKey?: string | undefined };
	};
	readonly startedAt: string;
	readonly artifactHash: string;
	readonly domainRuntime: DomainRuntimePort;
	readonly refreshSubscriptions: Readonly<
		Record<
			string,
			{ readonly signalIds: readonly string[]; readonly queryId: string }
		>
	>;
	readonly nowIso: () => string;
}

const normalizeEffects = (
	effects: readonly EffectKind[],
): readonly EffectKind[] =>
	[...new Set(effects)].sort((left, right) => left.localeCompare(right));

const hasDisallowedQueryEffects = (effects: readonly EffectKind[]): boolean =>
	effects.some(
		(effect) => effect === "write" || effect === "session" || effect === "emit",
	);

export const executeEntrypointTail = async (
	input: ExecuteTailInput,
): Promise<ResultEnvelope<unknown, unknown>> => {
	const execution =
		input.entrypoint.kind === "query"
			? await input.domainRuntime.executeQuery({
					entrypoint: input.entrypoint,
					kind: input.entrypoint.kind,
					input: input.invocation.input,
					principal: input.invocation.principal,
					ctx: {
						invocationId: input.invocation.invocationId,
						traceId: input.invocation.traceId,
						now: input.startedAt,
					},
				})
			: await input.domainRuntime.executeMutation({
					entrypoint: input.entrypoint,
					kind: input.entrypoint.kind,
					input: input.invocation.input,
					principal: input.invocation.principal,
					ctx: {
						invocationId: input.invocation.invocationId,
						traceId: input.invocation.traceId,
						now: input.startedAt,
					},
				});

	if (
		input.entrypoint.kind === "query" &&
		hasDisallowedQueryEffects(execution.observedEffects)
	) {
		const completedAt = input.nowIso();
		return {
			envelopeVersion,
			traceId: input.invocation.traceId,
			invocationId: input.invocation.invocationId,
			ok: false,
			error: {
				envelopeVersion,
				code: "effect_violation_error",
				message:
					"Query execution observed disallowed write/session/emit effects.",
				retryable: false,
			},
			emittedSignals: [],
			observedEffects: normalizeEffects(execution.observedEffects),
			timings: {
				startedAt: input.startedAt,
				completedAt,
				durationMs: calculateIsoDurationMs(input.startedAt, completedAt),
			},
			meta: {
				replayed: false,
				artifactHash: input.artifactHash,
				affectedQueryIds: [],
				refreshTriggers: [],
			},
		};
	}

	if (!execution.ok) {
		const completedAt = input.nowIso();
		return {
			envelopeVersion,
			traceId: input.invocation.traceId,
			invocationId: input.invocation.invocationId,
			ok: false,
			error: {
				envelopeVersion,
				code: "invocation_error",
				message: "Domain runtime returned a typed execution error.",
				retryable: false,
				typed: execution.error,
			},
			emittedSignals: [],
			observedEffects: normalizeEffects(execution.observedEffects),
			timings: {
				startedAt: input.startedAt,
				completedAt,
				durationMs: calculateIsoDurationMs(input.startedAt, completedAt),
			},
			meta: {
				replayed: false,
				artifactHash: input.artifactHash,
				affectedQueryIds: [],
				refreshTriggers: [],
			},
		};
	}

	const completedAt = input.nowIso();
	const emittedSignals: readonly SignalEnvelope[] =
		execution.emittedSignals ?? [];
	const refreshTriggers = buildRefreshTriggers(emittedSignals);
	const affectedQueryIds = resolveAffectedQueryIds(
		input.refreshSubscriptions,
		refreshTriggers,
	);

	return {
		envelopeVersion,
		traceId: input.invocation.traceId,
		invocationId: input.invocation.invocationId,
		ok: true,
		output: execution.output,
		emittedSignals,
		observedEffects: normalizeEffects(execution.observedEffects),
		timings: {
			startedAt: input.startedAt,
			completedAt,
			durationMs: calculateIsoDurationMs(input.startedAt, completedAt),
		},
		meta: {
			replayed: false,
			artifactHash: input.artifactHash,
			affectedQueryIds,
			refreshTriggers,
		},
	};
};
