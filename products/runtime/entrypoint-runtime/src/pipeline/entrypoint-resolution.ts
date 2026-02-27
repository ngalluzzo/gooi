import type { CompiledEntrypoint } from "@gooi/spec-compiler/contracts";
import { surfaceEnvelopeVersion } from "@gooi/surface-contracts/envelope-version";
import type { InvocationEnvelope } from "@gooi/surface-contracts/invocation-envelope";
import type { HostPortSet } from "../host";
import type { RunEntrypointInput } from "../types/types";

/**
 * Builds the base invocation envelope before input binding.
 */
export const buildInvocationEnvelope = (
	input: RunEntrypointInput,
	startedAt: string,
	hostPorts: HostPortSet,
): InvocationEnvelope<Readonly<Record<string, unknown>>> => ({
	envelopeVersion: surfaceEnvelopeVersion,
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
});

/**
 * Resolves one compiled entrypoint from kind/id binding coordinates.
 */
export const resolveEntrypoint = (
	bindingKind: string,
	bindingEntrypointId: string,
	entrypoints: Readonly<Record<string, CompiledEntrypoint>>,
): CompiledEntrypoint | undefined =>
	entrypoints[`${bindingKind}:${bindingEntrypointId}`];
