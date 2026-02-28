import type {
	AppRuntime,
	AppRuntimeInvokeInput,
	CreateAppRuntimeInput,
} from "@gooi/app-runtime-facade-contracts/create";
import { runEntrypointThroughKernel } from "@gooi/execution-kernel/entrypoint";
import { describeRuntimeReachability } from "../reachability/describe-runtime-reachability";
import {
	createBindingIndex,
	createMissingBindingFallback,
	resolveBinding,
} from "../shared/binding-index";
import { monotonicNow } from "../shared/timing";

export const createAppRuntime = (input: CreateAppRuntimeInput): AppRuntime => {
	const bindingIndex = createBindingIndex(input.bundle.bindings);

	return {
		describeReachability: (query) =>
			describeRuntimeReachability({
				requirements: input.bundle.bindingRequirementsArtifact,
				...(input.bindingPlan === undefined
					? {}
					: { bindingPlan: input.bindingPlan }),
				query,
			}),
		invoke: async (invokeInput: AppRuntimeInvokeInput) => {
			const started = monotonicNow();
			const binding = resolveBinding(bindingIndex, invokeInput);
			const result = await runEntrypointThroughKernel({
				bundle: input.bundle,
				binding: binding ?? createMissingBindingFallback(invokeInput),
				payload: invokeInput.payload,
				principal: invokeInput.principal,
				domainRuntime: input.domainRuntime,
				hostPorts: input.hostPorts,
				...(invokeInput.idempotencyKey === undefined
					? {}
					: { idempotencyKey: invokeInput.idempotencyKey }),
				...(input.replayStore === undefined
					? {}
					: { replayStore: input.replayStore }),
				...((invokeInput.replayTtlSeconds ?? input.replayTtlSeconds) ===
				undefined
					? {}
					: {
							replayTtlSeconds:
								invokeInput.replayTtlSeconds ?? input.replayTtlSeconds,
						}),
				...(invokeInput.invocationId === undefined
					? {}
					: { invocationId: invokeInput.invocationId }),
				...(invokeInput.traceId === undefined
					? {}
					: { traceId: invokeInput.traceId }),
				...((invokeInput.now ?? input.now) === undefined
					? {}
					: { now: invokeInput.now ?? input.now }),
			});
			const completed = monotonicNow();
			input.onInvokeMeasured?.({
				surfaceId: invokeInput.surfaceId,
				entrypointKind: invokeInput.entrypointKind,
				entrypointId: invokeInput.entrypointId,
				bindingMatched: binding !== undefined,
				overheadMs: completed - started,
			});
			return result;
		},
	};
};
