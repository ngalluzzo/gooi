import type { EffectKind } from "@gooi/capability-contracts/capability-port";
import type { PrincipalContext } from "@gooi/host-contracts/principal";
import type { CompiledEntrypoint } from "@gooi/spec-compiler/contracts";
import { sha256, stableStringify } from "@gooi/stable-json";
import { surfaceEnvelopeVersion } from "@gooi/surface-contracts/envelope-version";
import type { ResultEnvelope } from "@gooi/surface-contracts/result-envelope";
import type { SignalEnvelope } from "@gooi/surface-contracts/signal-envelope";
import { bindSurfaceInput } from "@gooi/surface-runtime";
import { buildRuntimeActivationReport } from "./artifact-manifest/runtime-activation-report";
import { validateRuntimeArtifactManifest } from "./artifact-manifest/validate-artifact-manifest";
import type { DomainRuntimePort } from "./domain";
import {
	errorEnvelope,
	errorResult,
	idempotencyScopeKey,
} from "./errors/errors";
import { createDefaultHostPorts, getMissingHostPortSetMembers } from "./host";
import { validateEntrypointInput } from "./input-validation/input-validation";
import {
	buildInvocationEnvelope,
	resolveEntrypoint,
} from "./pipeline/entrypoint-resolution";
import {
	buildInvalidReplayTtlResult,
	buildMissingHostPortsResult,
} from "./pipeline/fallback-errors";
import { resolvePolicyGate } from "./pipeline/policy-gate";
import { validateSchemaProfile } from "./pipeline/schema-profile";
import {
	buildRefreshTriggers,
	resolveAffectedQueryIds,
} from "./refresh/refresh";
import { calculateIsoDurationMs } from "./timing/duration";
import type {
	CreateEntrypointRuntimeInput as SharedCreateEntrypointRuntimeInput,
	EntrypointRuntime as SharedEntrypointRuntime,
	RunEntrypointCallInput as SharedRunEntrypointCallInput,
	RunEntrypointInput as SharedRunEntrypointInput,
} from "./types/types";

export type { DomainRuntimePort };
export { createDefaultHostPorts };

const envelopeVersion = surfaceEnvelopeVersion;
const defaultReplayTtlSeconds = 300;

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

const isValidReplayTtlSeconds = (value: number): boolean =>
	Number.isInteger(value) && value > 0;

const executeEntrypointTail = async (
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

/**
 * Input payload for deterministic entrypoint runtime execution.
 */
export type RunEntrypointInput = SharedRunEntrypointInput;

/**
 * Runtime configuration shared across many entrypoint invocations.
 */
export type CreateEntrypointRuntimeInput = SharedCreateEntrypointRuntimeInput;

/**
 * Per-invocation input for a configured entrypoint runtime.
 */
export type RunEntrypointCallInput = SharedRunEntrypointCallInput;

/**
 * Entrypoint runtime orchestration API.
 */
export type EntrypointRuntime = SharedEntrypointRuntime;

/**
 * Creates a cohesive entrypoint runtime API with shared execution defaults.
 */
export const createEntrypointRuntime = (
	input: CreateEntrypointRuntimeInput,
): EntrypointRuntime => ({
	run: (runInput) => {
		const invocationInput: RunEntrypointInput = {
			bundle: input.bundle,
			domainRuntime: input.domainRuntime,
			binding: runInput.binding,
			request: runInput.request,
			principal: runInput.principal,
			...(input.replayStore === undefined
				? {}
				: { replayStore: input.replayStore }),
			...(input.replayTtlSeconds === undefined
				? {}
				: { replayTtlSeconds: input.replayTtlSeconds }),
			...(input.hostPorts === undefined ? {} : { hostPorts: input.hostPorts }),
			...(runInput.idempotencyKey === undefined
				? {}
				: { idempotencyKey: runInput.idempotencyKey }),
			...(runInput.invocationId === undefined
				? {}
				: { invocationId: runInput.invocationId }),
			...(runInput.traceId === undefined ? {} : { traceId: runInput.traceId }),
			...(runInput.now === undefined ? {} : { now: runInput.now }),
		};
		return runEntrypoint(invocationInput);
	},
});

/**
 * Executes one compiled query or mutation entrypoint invocation.
 */
export const runEntrypoint = async (
	input: RunEntrypointInput,
): Promise<ResultEnvelope<unknown, unknown>> => {
	const hostPorts = input.hostPorts ?? createDefaultHostPorts();
	const replayTtlSeconds = input.replayTtlSeconds ?? defaultReplayTtlSeconds;
	if (!isValidReplayTtlSeconds(replayTtlSeconds)) {
		return buildInvalidReplayTtlResult({
			invocation: {
				binding: input.binding,
				principal: input.principal,
				...(input.idempotencyKey === undefined
					? {}
					: { idempotencyKey: input.idempotencyKey }),
				...(input.traceId === undefined ? {} : { traceId: input.traceId }),
				...(input.invocationId === undefined
					? {}
					: { invocationId: input.invocationId }),
				...(input.now === undefined ? {} : { now: input.now }),
			},
			artifactHash: input.bundle.artifactHash,
			replayTtlSeconds,
		});
	}

	const missingHostPortMembers = getMissingHostPortSetMembers(hostPorts);
	if (missingHostPortMembers.length > 0) {
		return buildMissingHostPortsResult({
			invocation: {
				binding: input.binding,
				principal: input.principal,
				...(input.idempotencyKey === undefined
					? {}
					: { idempotencyKey: input.idempotencyKey }),
				...(input.traceId === undefined ? {} : { traceId: input.traceId }),
				...(input.invocationId === undefined
					? {}
					: { invocationId: input.invocationId }),
				...(input.now === undefined ? {} : { now: input.now }),
			},
			artifactHash: input.bundle.artifactHash,
			missingHostPortMembers,
		});
	}

	const startedAt = input.now ?? hostPorts.clock.nowIso();
	const baseInvocation = buildInvocationEnvelope(input, startedAt, hostPorts);
	const manifestValidation = validateRuntimeArtifactManifest(input.bundle);
	if (!manifestValidation.ok) {
		const activationReport = buildRuntimeActivationReport({
			bundle: input.bundle,
			status: "mismatch",
			diagnostics: manifestValidation.diagnostics,
		});
		return errorResult(
			baseInvocation,
			input.bundle.artifactHash,
			startedAt,
			hostPorts.clock.nowIso,
			errorEnvelope(
				"validation_error",
				"Compiled artifact manifest validation failed during activation.",
				false,
				{
					code: "manifest_validation_error",
					diagnostics: manifestValidation.diagnostics,
					activation: activationReport,
				},
			),
		);
	}

	const entrypoint = resolveEntrypoint(
		input.binding.entrypointKind,
		input.binding.entrypointId,
		input.bundle.entrypoints,
	);
	if (entrypoint === undefined) {
		return errorResult(
			baseInvocation,
			input.bundle.artifactHash,
			startedAt,
			hostPorts.clock.nowIso,
			errorEnvelope(
				"entrypoint_not_found_error",
				"Compiled entrypoint was not found for binding.",
				false,
			),
		);
	}

	const bound = bindSurfaceInput({
		request: input.request,
		entrypoint,
		binding: input.binding,
	});
	if (!bound.ok) {
		return errorResult(
			baseInvocation,
			input.bundle.artifactHash,
			startedAt,
			hostPorts.clock.nowIso,
			errorEnvelope(
				"binding_error",
				bound.error.message,
				false,
				bound.error.details,
			),
		);
	}

	const resolvedInvocation = {
		...baseInvocation,
		entrypointId: entrypoint.id,
		entrypointKind: entrypoint.kind,
		input: bound.value,
	};

	const schemaValidation = validateSchemaProfile({
		bundle: input.bundle,
		entrypoint,
		invocation: resolvedInvocation,
		startedAt,
		nowIso: hostPorts.clock.nowIso,
	});
	if (!schemaValidation.ok) {
		return schemaValidation.result;
	}

	const validatedInput = validateEntrypointInput(entrypoint, bound.value);
	if (!validatedInput.ok) {
		return errorResult(
			resolvedInvocation,
			input.bundle.artifactHash,
			startedAt,
			hostPorts.clock.nowIso,
			errorEnvelope(
				"validation_error",
				"Entrypoint input validation failed.",
				false,
				validatedInput.details,
			),
		);
	}

	const policyGate = resolvePolicyGate({
		bundle: input.bundle,
		entrypoint,
		invocation: resolvedInvocation,
		hostPorts,
		principalInput: input.principal,
		startedAt,
		nowIso: hostPorts.clock.nowIso,
	});
	if (!policyGate.ok) {
		return policyGate.result;
	}

	const validatedInvocation = {
		...resolvedInvocation,
		principal: policyGate.principal,
		input: validatedInput.value,
	};

	let scope: string | null = null;
	let inputHash: string | null = null;
	if (
		entrypoint.kind === "mutation" &&
		input.idempotencyKey !== undefined &&
		input.replayStore
	) {
		inputHash = sha256(stableStringify(validatedInvocation.input));
		scope = idempotencyScopeKey(
			entrypoint,
			validatedInvocation.principal,
			input.idempotencyKey,
		);
		const existing = await input.replayStore.load(scope);
		if (existing !== null) {
			if (existing.inputHash !== inputHash) {
				return errorResult(
					resolvedInvocation,
					input.bundle.artifactHash,
					startedAt,
					hostPorts.clock.nowIso,
					errorEnvelope(
						"idempotency_conflict_error",
						"Idempotency key reuse conflict.",
						false,
					),
				);
			}
			return {
				...existing.result,
				meta: { ...existing.result.meta, replayed: true },
			};
		}
	}

	const result = await executeEntrypointTail({
		entrypoint,
		invocation: validatedInvocation,
		startedAt,
		artifactHash: input.bundle.artifactHash,
		domainRuntime: input.domainRuntime,
		refreshSubscriptions: input.bundle.refreshSubscriptions,
		nowIso: hostPorts.clock.nowIso,
	});

	if (
		entrypoint.kind === "mutation" &&
		scope !== null &&
		inputHash !== null &&
		input.replayStore
	) {
		await input.replayStore.save({
			scopeKey: scope,
			record: { inputHash, result },
			ttlSeconds: replayTtlSeconds,
		});
	}

	return result;
};
