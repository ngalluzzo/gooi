import type { CompiledEntrypointKind } from "@gooi/app-spec-contracts/compiled";
import type { PrincipalContext } from "@gooi/host-contracts/principal";
import {
	envelope,
	type InvocationEnvelope,
	type ResultEnvelope,
} from "@gooi/surface-contracts/envelope";
import type { HostPortContractIssue } from "../entrypoint/types";
import { errorEnvelope, errorResult } from "./errors";

export const hostPortValidationFallbackNow = "1970-01-01T00:00:00.000Z";
export const hostPortValidationFallbackTraceId = "trace_host_port_missing";
export const hostPortValidationFallbackInvocationId =
	"invocation_host_port_missing";

interface FallbackInvocationInput {
	readonly binding: {
		readonly entrypointId: string;
		readonly entrypointKind: CompiledEntrypointKind;
	};
	readonly principal: PrincipalContext;
	readonly idempotencyKey?: string | undefined;
	readonly traceId?: string;
	readonly invocationId?: string;
	readonly now?: string;
}

interface BuildFallbackErrorResultInput {
	readonly invocation: FallbackInvocationInput;
	readonly artifactHash: string;
	readonly message: string;
	readonly details: Readonly<Record<string, unknown>>;
}

const buildFallbackInvocationEnvelope = (
	input: FallbackInvocationInput,
	fallbackNow: string,
): InvocationEnvelope<Readonly<Record<string, unknown>>> => ({
	envelopeVersion: envelope.surfaceEnvelopeVersion,
	traceId: input.traceId ?? hostPortValidationFallbackTraceId,
	invocationId: input.invocationId ?? hostPortValidationFallbackInvocationId,
	entrypointId: input.binding.entrypointId,
	entrypointKind: input.binding.entrypointKind,
	principal: input.principal,
	input: {},
	meta: {
		...(input.idempotencyKey === undefined
			? {}
			: { idempotencyKey: input.idempotencyKey }),
		requestReceivedAt: fallbackNow,
	},
});

const buildFallbackErrorResult = (
	input: BuildFallbackErrorResultInput,
): ResultEnvelope<unknown, unknown> => {
	const fallbackNow = input.invocation.now ?? hostPortValidationFallbackNow;
	const baseInvocation = buildFallbackInvocationEnvelope(
		input.invocation,
		fallbackNow,
	);
	return errorResult(
		baseInvocation,
		input.artifactHash,
		fallbackNow,
		() => fallbackNow,
		errorEnvelope("validation_error", input.message, false, input.details),
	);
};

/**
 * Builds a typed validation result for missing required host-port members.
 */
export const buildMissingHostPortsResult = (input: {
	readonly invocation: FallbackInvocationInput;
	readonly artifactHash: string;
	readonly missingHostPortMembers: readonly HostPortContractIssue[];
}): ResultEnvelope<unknown, unknown> =>
	buildFallbackErrorResult({
		invocation: input.invocation,
		artifactHash: input.artifactHash,
		message: "Host port set is missing required members.",
		details: {
			code: "host_port_missing",
			missingHostPortMembers: input.missingHostPortMembers,
		},
	});

/**
 * Builds a typed validation result for invalid replay TTL configuration.
 */
export const buildInvalidReplayTtlResult = (input: {
	readonly invocation: FallbackInvocationInput;
	readonly artifactHash: string;
	readonly replayTtlSeconds: number;
}): ResultEnvelope<unknown, unknown> =>
	buildFallbackErrorResult({
		invocation: input.invocation,
		artifactHash: input.artifactHash,
		message: "Replay TTL seconds must be a positive integer.",
		details: {
			code: "replay_ttl_invalid",
			replayTtlSeconds: input.replayTtlSeconds,
		},
	});
