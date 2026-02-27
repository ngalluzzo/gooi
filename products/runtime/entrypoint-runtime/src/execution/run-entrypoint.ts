import { runEntrypointThroughKernel } from "@gooi/execution-kernel/entrypoint";
import type { ResultEnvelope } from "@gooi/surface-contracts/result-envelope";
import { createDefaultHostPorts } from "../host";
import type { RunEntrypointInput as SharedRunEntrypointInput } from "../types/types";

/**
 * Input payload for deterministic entrypoint runtime execution.
 */
export type RunEntrypointInput = SharedRunEntrypointInput;

/**
 * Executes one compiled query or mutation entrypoint invocation.
 */
export const runEntrypoint = async (
	input: RunEntrypointInput,
): Promise<ResultEnvelope<unknown, unknown>> =>
	runEntrypointThroughKernel({
		bundle: input.bundle,
		binding: input.binding,
		request: input.request,
		principal: input.principal,
		domainRuntime: input.domainRuntime,
		hostPorts: input.hostPorts ?? createDefaultHostPorts(),
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
