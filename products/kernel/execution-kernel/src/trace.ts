export interface KernelTraceInput {
	readonly entrypointId: string;
	readonly kind: "query" | "mutation";
	readonly stage: string;
	readonly invocationId?: string;
	readonly traceId?: string;
	readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface KernelTraceEnvelope {
	readonly traceId: string;
	readonly invocationId: string;
	readonly entrypointId: string;
	readonly kind: "query" | "mutation";
	readonly stage: string;
	readonly timestamp: string;
	readonly metadata?: Readonly<Record<string, unknown>>;
}

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
