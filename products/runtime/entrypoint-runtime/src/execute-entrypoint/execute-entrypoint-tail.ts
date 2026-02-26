import type { EffectKind } from "@gooi/contracts-capability";
import type { CompiledEntrypoint } from "@gooi/spec-compiler/contracts";
import type { DomainRuntimePort } from "../domain-runtime-port/domain-runtime-port";
import type {
	PrincipalContext,
	ResultEnvelope,
	SignalEnvelope,
} from "../entrypoint-runtime-contracts/entrypoint-runtime.contracts";
import { buildRefreshTriggers, resolveAffectedQueryIds } from "./refresh";

const envelopeVersion = "1.0.0" as const;

interface ExecuteTailInput {
	readonly entrypoint: CompiledEntrypoint;
	readonly invocation: {
		readonly traceId: string;
		readonly invocationId: string;
		readonly principal: PrincipalContext;
		readonly input: Readonly<Record<string, unknown>>;
		readonly meta: { readonly idempotencyKey?: string };
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
	/** Clock callback used for completion timestamps. */
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

const buildSuccess = (
	input: ExecuteTailInput,
	output: unknown,
	observedEffects: readonly EffectKind[],
	emittedSignals: readonly SignalEnvelope[],
): ResultEnvelope<unknown, unknown> => {
	const completedAt = input.nowIso();
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
		output,
		emittedSignals,
		observedEffects: normalizeEffects(observedEffects),
		timings: {
			startedAt: input.startedAt,
			completedAt,
			durationMs: Math.max(
				0,
				Date.parse(completedAt) - Date.parse(input.startedAt),
			),
		},
		meta: {
			replayed: false,
			artifactHash: input.artifactHash,
			affectedQueryIds,
		},
	};
};

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
				durationMs: Math.max(
					0,
					Date.parse(completedAt) - Date.parse(input.startedAt),
				),
			},
			meta: {
				replayed: false,
				artifactHash: input.artifactHash,
				affectedQueryIds: [],
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
				durationMs: Math.max(
					0,
					Date.parse(completedAt) - Date.parse(input.startedAt),
				),
			},
			meta: {
				replayed: false,
				artifactHash: input.artifactHash,
				affectedQueryIds: [],
			},
		};
	}
	return buildSuccess(
		input,
		execution.output,
		execution.observedEffects,
		execution.emittedSignals ?? [],
	);
};
