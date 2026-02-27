import type {
	CompiledEntrypoint,
	CompiledSurfaceBinding,
} from "@gooi/app-spec-contracts/compiled";
import type { KernelInvokeResult } from "@gooi/kernel-contracts/invocation";
import type { KernelRuntime } from "@gooi/kernel-contracts/runtime";
import type { SurfaceRequestPayload } from "@gooi/surface-contracts/surface-request";
import { bindSurfaceInput } from "./engine";

export interface DispatchSurfaceThroughKernelInput {
	readonly kernel: KernelRuntime;
	readonly binding: CompiledSurfaceBinding;
	readonly entrypoint: CompiledEntrypoint;
	readonly request: SurfaceRequestPayload;
	readonly principal: unknown;
	readonly hostPorts: unknown;
	readonly invocationId?: string;
	readonly traceId?: string;
	readonly nowIso?: string;
}

export const dispatchSurfaceThroughKernel = async (
	input: DispatchSurfaceThroughKernelInput,
): Promise<KernelInvokeResult> => {
	const bound = bindSurfaceInput({
		entrypoint: input.entrypoint,
		binding: input.binding,
		request: input.request,
	});
	if (!bound.ok) {
		return {
			ok: false,
			error:
				bound.error.details === undefined
					? {
							code: bound.error.code,
							message: bound.error.message,
						}
					: {
							code: bound.error.code,
							message: bound.error.message,
							details: bound.error.details,
						},
		};
	}

	return input.kernel.invoke({
		entrypointId: input.entrypoint.id,
		kind: input.entrypoint.kind,
		payload: bound.value,
		principal: input.principal,
		hostPorts: input.hostPorts,
		...(input.invocationId === undefined
			? {}
			: { invocationId: input.invocationId }),
		...(input.traceId === undefined ? {} : { traceId: input.traceId }),
		...(input.nowIso === undefined ? {} : { nowIso: input.nowIso }),
	});
};
