import type {
	CreateEntrypointRuntimeInput as SharedCreateEntrypointRuntimeInput,
	EntrypointRuntime as SharedEntrypointRuntime,
	RunEntrypointCallInput as SharedRunEntrypointCallInput,
} from "../types/types";
import type { RunEntrypointInput } from "./run-entrypoint";
import { runEntrypoint } from "./run-entrypoint";

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
