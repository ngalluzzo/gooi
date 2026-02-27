import type { KernelRuntime } from "@gooi/execution-kernel";
import type { KernelInvokeResult } from "@gooi/execution-kernel/invoke";
import type { HostPortSet } from "./host";

export interface EntrypointKernelCallInput {
	readonly kernel: KernelRuntime;
	readonly entrypointId: string;
	readonly kind: "query" | "mutation";
	readonly payload: Readonly<Record<string, unknown>>;
	readonly principal: unknown;
	readonly hostPorts: HostPortSet;
	readonly invocationId?: string;
	readonly traceId?: string;
	readonly nowIso?: string;
}

export const invokeEntrypointViaKernel = async (
	input: EntrypointKernelCallInput,
): Promise<KernelInvokeResult> =>
	input.kernel.invoke({
		entrypointId: input.entrypointId,
		kind: input.kind,
		payload: input.payload,
		principal: input.principal,
		hostPorts: input.hostPorts,
		...(input.invocationId === undefined
			? {}
			: { invocationId: input.invocationId }),
		...(input.traceId === undefined ? {} : { traceId: input.traceId }),
		...(input.nowIso === undefined ? {} : { nowIso: input.nowIso }),
	});
