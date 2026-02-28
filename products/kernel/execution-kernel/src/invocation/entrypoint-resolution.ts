import type { CompiledEntrypoint } from "@gooi/app-spec-contracts/compiled";
import {
	envelope,
	type InvocationEnvelope,
} from "@gooi/surface-contracts/envelope";
import type { HostPortSet, RunEntrypointInput } from "../entrypoint/types";

/**
 * Builds the base invocation envelope before input binding.
 */
export const buildInvocationEnvelope = (
	input: RunEntrypointInput,
	startedAt: string,
	hostPorts: HostPortSet,
): InvocationEnvelope<Readonly<Record<string, unknown>>> => ({
	envelopeVersion: envelope.surfaceEnvelopeVersion,
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
