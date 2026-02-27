import type {
	KernelTraceEnvelope,
	KernelTraceInput,
} from "@gooi/kernel-contracts/trace";
export type { KernelTraceEnvelope, KernelTraceInput };

export const createKernelTraceEnvelope = (
	input: KernelTraceInput,
	nowIso: string,
): KernelTraceEnvelope => ({
	traceId: input.traceId ?? "kernel-trace",
	invocationId: input.invocationId ?? "kernel-invocation",
	entrypointId: input.entrypointId,
	kind: input.kind,
	stage: input.stage,
	timestamp: nowIso,
	...(input.metadata === undefined ? {} : { metadata: input.metadata }),
});
