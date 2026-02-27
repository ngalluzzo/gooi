import type {
	CompiledEntrypointBundle,
	CompiledSurfaceBinding,
} from "@gooi/app-spec-contracts/compiled";
import { runEntrypointThroughKernel } from "@gooi/execution-kernel/entrypoint";
import { createSystemClockPort } from "@gooi/host-contracts/clock";
import { createFailingCapabilityDelegationPort } from "@gooi/host-contracts/delegation";
import { createSystemIdentityPort } from "@gooi/host-contracts/identity";
import type { HostPortSet as SharedHostPortSet } from "@gooi/host-contracts/portset";
import {
	createHostPrincipalPort,
	type PrincipalContext,
	principalContextSchema,
} from "@gooi/host-contracts/principal";
import type { HostReplayStorePort } from "@gooi/host-contracts/replay";
import { hostFail, hostOk } from "@gooi/host-contracts/result";
import type { KernelSemanticRuntimePort } from "@gooi/kernel-contracts/semantic-engine";
import { surfaceEnvelopeVersion } from "@gooi/surface-contracts/envelope-version";
import type { ResultEnvelope } from "@gooi/surface-contracts/result-envelope";
import type { SurfaceRequestPayload } from "@gooi/surface-contracts/surface-request";
import { bindSurfaceInput } from "@gooi/surface-runtime";

const calculateIsoDurationMs = (
	startedAt: string,
	completedAt: string,
): number => {
	const startedMs = Date.parse(startedAt);
	const completedMs = Date.parse(completedAt);
	if (Number.isNaN(startedMs) || Number.isNaN(completedMs)) {
		return 0;
	}
	return Math.max(0, completedMs - startedMs);
};

const principalValidation = principalContextSchema.safeParse;

export type EntrypointHostPortSet = SharedHostPortSet<
	PrincipalContext,
	ResultEnvelope<unknown, unknown>
>;

export interface RunEntrypointInput {
	readonly bundle: CompiledEntrypointBundle;
	readonly binding: CompiledSurfaceBinding;
	readonly request: SurfaceRequestPayload;
	readonly principal: PrincipalContext;
	readonly domainRuntime: KernelSemanticRuntimePort;
	readonly hostPorts?: unknown;
	readonly idempotencyKey?: string | undefined;
	readonly replayStore?: HostReplayStorePort<ResultEnvelope<unknown, unknown>>;
	readonly replayTtlSeconds?: number;
	readonly invocationId?: string;
	readonly traceId?: string;
	readonly now?: string;
}

export const createDefaultConformanceHostPorts = (): EntrypointHostPortSet => ({
	clock: createSystemClockPort(),
	identity: createSystemIdentityPort(),
	principal: createHostPrincipalPort({
		validatePrincipal: (value) => {
			const parsed = principalValidation(value);
			if (!parsed.success) {
				return hostFail(
					"principal_validation_error",
					"Invalid principal context.",
					{ issues: parsed.error.issues },
				);
			}
			return hostOk(parsed.data);
		},
	}),
	capabilityDelegation: createFailingCapabilityDelegationPort(),
});

const resolveEntrypoint = (
	bundle: CompiledEntrypointBundle,
	binding: CompiledSurfaceBinding,
) => bundle.entrypoints[`${binding.entrypointKind}:${binding.entrypointId}`];

const buildBindingErrorResult = (input: {
	readonly hostPorts: EntrypointHostPortSet;
	readonly invocationId?: string;
	readonly traceId?: string;
	readonly now?: string;
	readonly artifactHash: string;
	readonly message: string;
	readonly details?: Readonly<Record<string, unknown>>;
}): ResultEnvelope<unknown, unknown> => {
	const startedAt = input.now ?? input.hostPorts.clock.nowIso();
	const completedAt = input.hostPorts.clock.nowIso();
	return {
		envelopeVersion: surfaceEnvelopeVersion,
		traceId: input.traceId ?? input.hostPorts.identity.newTraceId(),
		invocationId:
			input.invocationId ?? input.hostPorts.identity.newInvocationId(),
		ok: false,
		error: {
			envelopeVersion: surfaceEnvelopeVersion,
			code: "binding_error",
			message: input.message,
			retryable: false,
			...(input.details === undefined ? {} : { details: input.details }),
		},
		emittedSignals: [],
		observedEffects: [],
		timings: {
			startedAt,
			completedAt,
			durationMs: calculateIsoDurationMs(startedAt, completedAt),
		},
		meta: {
			replayed: false,
			artifactHash: input.artifactHash,
			affectedQueryIds: [],
			refreshTriggers: [],
		},
	};
};

export const runEntrypoint = async (
	input: RunEntrypointInput,
): Promise<ResultEnvelope<unknown, unknown>> => {
	const hostPorts = (input.hostPorts ??
		createDefaultConformanceHostPorts()) as EntrypointHostPortSet;
	const entrypoint = resolveEntrypoint(input.bundle, input.binding);
	if (entrypoint !== undefined) {
		const bound = bindSurfaceInput({
			request: input.request,
			entrypoint,
			binding: input.binding,
		});
		if (!bound.ok) {
			return buildBindingErrorResult({
				hostPorts,
				artifactHash: input.bundle.artifactHash,
				message: bound.error.message,
				...(input.invocationId === undefined
					? {}
					: { invocationId: input.invocationId }),
				...(input.traceId === undefined ? {} : { traceId: input.traceId }),
				...(input.now === undefined ? {} : { now: input.now }),
				...(bound.error.details === undefined
					? {}
					: { details: bound.error.details }),
			});
		}

		return runEntrypointThroughKernel({
			bundle: input.bundle,
			binding: input.binding,
			payload: bound.value,
			principal: input.principal,
			domainRuntime: input.domainRuntime,
			hostPorts,
			...(input.idempotencyKey === undefined
				? {}
				: { idempotencyKey: input.idempotencyKey }),
			...(input.replayStore === undefined
				? {}
				: { replayStore: input.replayStore }),
			...(input.replayTtlSeconds === undefined
				? {}
				: { replayTtlSeconds: input.replayTtlSeconds }),
			...(input.invocationId === undefined
				? {}
				: { invocationId: input.invocationId }),
			...(input.traceId === undefined ? {} : { traceId: input.traceId }),
			...(input.now === undefined ? {} : { now: input.now }),
		});
	}

	return runEntrypointThroughKernel({
		bundle: input.bundle,
		binding: input.binding,
		payload: {},
		principal: input.principal,
		domainRuntime: input.domainRuntime,
		hostPorts,
		...(input.idempotencyKey === undefined
			? {}
			: { idempotencyKey: input.idempotencyKey }),
		...(input.replayStore === undefined
			? {}
			: { replayStore: input.replayStore }),
		...(input.replayTtlSeconds === undefined
			? {}
			: { replayTtlSeconds: input.replayTtlSeconds }),
		...(input.invocationId === undefined
			? {}
			: { invocationId: input.invocationId }),
		...(input.traceId === undefined ? {} : { traceId: input.traceId }),
		...(input.now === undefined ? {} : { now: input.now }),
	});
};
