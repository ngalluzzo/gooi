import { runEntrypointThroughKernel } from "@gooi/execution-kernel/entrypoint";
import type { ResultEnvelope } from "@gooi/surface-contracts/result-envelope";
import { bindSurfaceInput } from "@gooi/surface-runtime";
import { errorEnvelope, errorResult } from "../errors/errors";
import { createDefaultHostPorts, getMissingHostPortSetMembers } from "../host";
import {
	buildInvocationEnvelope,
	resolveEntrypoint,
} from "../pipeline/entrypoint-resolution";
import {
	buildInvalidReplayTtlResult,
	buildMissingHostPortsResult,
} from "../pipeline/fallback-errors";
import type { RunEntrypointInput as SharedRunEntrypointInput } from "../types/types";
import {
	buildInvocationMeta,
	defaultReplayTtlSeconds,
	isValidReplayTtlSeconds,
} from "./run-entrypoint-helpers";

/**
 * Input payload for deterministic entrypoint runtime execution.
 */
export type RunEntrypointInput = SharedRunEntrypointInput;

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
			invocation: buildInvocationMeta(input),
			artifactHash: input.bundle.artifactHash,
			replayTtlSeconds,
		});
	}

	const missingHostPortMembers = getMissingHostPortSetMembers(hostPorts);
	if (missingHostPortMembers.length > 0) {
		return buildMissingHostPortsResult({
			invocation: buildInvocationMeta(input),
			artifactHash: input.bundle.artifactHash,
			missingHostPortMembers,
		});
	}

	const entrypoint = resolveEntrypoint(
		input.binding.entrypointKind,
		input.binding.entrypointId,
		input.bundle.entrypoints,
	);
	if (entrypoint === undefined) {
		const startedAt = input.now ?? hostPorts.clock.nowIso();
		const baseInvocation = buildInvocationEnvelope(input, startedAt, hostPorts);
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
		const startedAt = input.now ?? hostPorts.clock.nowIso();
		const baseInvocation = buildInvocationEnvelope(input, startedAt, hostPorts);
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
};
