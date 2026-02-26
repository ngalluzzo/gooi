import type {
	CompiledEntrypoint,
	CompiledEntrypointBundle,
	CompiledSurfaceBinding,
} from "@gooi/spec-compiler/contracts";
import { sha256, stableStringify } from "@gooi/stable-json";
import type { SurfaceRequestPayload } from "@gooi/surface-bindings";
import { bindSurfaceInput } from "@gooi/surface-bindings";
import type { DomainRuntimePort } from "../domain-runtime-port/domain-runtime-port";
import type {
	InvocationEnvelope,
	PrincipalContext,
	ResultEnvelope,
	TypedErrorEnvelope,
} from "../entrypoint-runtime-contracts/entrypoint-runtime.contracts";
import {
	createDefaultEntrypointHostPorts,
	type EntrypointHostPorts,
} from "../host-ports/host-ports";
import type { IdempotencyStore } from "../idempotency-store/idempotency-store";
import { isAccessAllowed } from "./access-gate";
import { executeEntrypointTail } from "./execute-entrypoint-tail";
import { validateEntrypointInput } from "./input-validation";

/**
 * Input payload for deterministic entrypoint runtime execution.
 */
export interface ExecuteEntrypointInput {
	/** Compiled entrypoint bundle consumed by runtime. */
	readonly bundle: CompiledEntrypointBundle;
	/** Compiled surface binding selected by adapter routing. */
	readonly binding: CompiledSurfaceBinding;
	/** Native surface payload used for binding extraction. */
	readonly request: SurfaceRequestPayload;
	/** Principal context used for policy gate checks. */
	readonly principal: PrincipalContext;
	/** Domain runtime port implementation for query and mutation execution. */
	readonly domainRuntime: DomainRuntimePort;
	/** Optional idempotency key for mutation replay behavior. */
	readonly idempotencyKey?: string;
	/** Optional idempotency store for replay and conflict detection. */
	readonly idempotencyStore?: IdempotencyStore;
	/** Optional invocation id override. */
	readonly invocationId?: string;
	/** Optional trace id override. */
	readonly traceId?: string;
	/** Optional timestamp override for deterministic tests. */
	readonly now?: string;
	/** Optional host ports for orchestration infrastructure behavior. */
	readonly hostPorts?: EntrypointHostPorts;
}

const envelopeVersion = "1.0.0" as const;

const errorEnvelope = (
	code: string,
	message: string,
	retryable: boolean,
	details?: Readonly<Record<string, unknown>>,
): TypedErrorEnvelope<unknown> => ({
	envelopeVersion,
	code,
	message,
	retryable,
	...(details === undefined ? {} : { details }),
});

const entrypointKey = (entrypoint: CompiledEntrypoint): string =>
	`${entrypoint.kind}:${entrypoint.id}`;

const idempotencyScopeKey = (
	entrypoint: CompiledEntrypoint,
	principal: PrincipalContext,
	idempotencyKey: string,
): string =>
	`${entrypoint.kind}:${entrypoint.id}:${principal.subject ?? "anonymous"}:${idempotencyKey}`;

const errorResult = (
	invocation: InvocationEnvelope<Readonly<Record<string, unknown>>>,
	artifactHash: string,
	startedAt: string,
	nowIso: () => string,
	error: TypedErrorEnvelope<unknown>,
): ResultEnvelope<unknown, unknown> => {
	const completedAt = nowIso();
	return {
		envelopeVersion,
		traceId: invocation.traceId,
		invocationId: invocation.invocationId,
		ok: false,
		error,
		emittedSignals: [],
		observedEffects: [],
		timings: {
			startedAt,
			completedAt,
			durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(startedAt)),
		},
		meta: { replayed: false, artifactHash, affectedQueryIds: [] },
	};
};

/**
 * Executes one compiled query or mutation entrypoint invocation.
 *
 * @param input - Runtime execution input payload.
 * @returns Deterministic execution result envelope.
 *
 * @example
 * const result = await executeEntrypoint({ bundle, binding, request, principal, domainRuntime });
 */
export const executeEntrypoint = async (
	input: ExecuteEntrypointInput,
): Promise<ResultEnvelope<unknown, unknown>> => {
	const hostPorts = input.hostPorts ?? createDefaultEntrypointHostPorts();
	const startedAt = input.now ?? hostPorts.clock.nowIso();
	const invocation: InvocationEnvelope<Readonly<Record<string, unknown>>> = {
		envelopeVersion,
		traceId: input.traceId ?? hostPorts.identity.newTraceId(),
		invocationId: input.invocationId ?? hostPorts.identity.newInvocationId(),
		entrypointId: input.binding.entrypointId,
		entrypointKind: input.binding.entrypointKind,
		principal: input.principal,
		input: {},
		meta: {
			...(input.idempotencyKey === undefined
				? {}
				: { idempotencyKey: input.idempotencyKey }),
			requestReceivedAt: startedAt,
		},
	};

	const entrypoint =
		input.bundle.entrypoints[
			`${input.binding.entrypointKind}:${input.binding.entrypointId}`
		];
	if (entrypoint === undefined) {
		return errorResult(
			invocation,
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
	if (
		!isAccessAllowed(
			input.bundle.accessPlan,
			entrypointKey(entrypoint),
			input.principal,
		)
	) {
		return errorResult(
			invocation,
			input.bundle.artifactHash,
			startedAt,
			hostPorts.clock.nowIso,
			errorEnvelope(
				"access_denied_error",
				"Access denied for entrypoint.",
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
			invocation,
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
		...invocation,
		entrypointId: entrypoint.id,
		entrypointKind: entrypoint.kind,
		input: bound.value,
	};

	if (
		input.bundle.schemaArtifacts[entrypoint.schemaArtifactKey] === undefined
	) {
		return errorResult(
			resolvedInvocation,
			input.bundle.artifactHash,
			startedAt,
			hostPorts.clock.nowIso,
			errorEnvelope(
				"validation_error",
				"Compiled entrypoint schema artifact is missing.",
				false,
				{
					entrypointId: entrypoint.id,
					entrypointKind: entrypoint.kind,
					schemaArtifactKey: entrypoint.schemaArtifactKey,
				},
			),
		);
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

	const validatedInvocation = {
		...resolvedInvocation,
		input: validatedInput.value,
	};

	let scope: string | null = null;
	let inputHash: string | null = null;
	if (
		entrypoint.kind === "mutation" &&
		input.idempotencyKey &&
		input.idempotencyStore
	) {
		inputHash = sha256(stableStringify(validatedInvocation.input));
		scope = idempotencyScopeKey(
			entrypoint,
			input.principal,
			input.idempotencyKey,
		);
		const existing = await input.idempotencyStore.load(scope);
		if (existing !== null) {
			if (existing.inputHash !== inputHash) {
				return errorResult(
					validatedInvocation,
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
		input.idempotencyStore
	) {
		await input.idempotencyStore.save(scope, { inputHash, result });
	}
	return result;
};
