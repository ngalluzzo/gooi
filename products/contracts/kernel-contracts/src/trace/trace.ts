import type { KernelInvocationKind } from "@gooi/kernel-contracts/invocation";
import type { KernelExecutionStage } from "@gooi/kernel-contracts/orchestration";

export interface KernelTraceInput {
	readonly entrypointId: string;
	readonly kind: KernelInvocationKind;
	readonly stage: KernelExecutionStage;
	readonly invocationId?: string;
	readonly traceId?: string;
	readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface KernelTraceEnvelope {
	readonly traceId: string;
	readonly invocationId: string;
	readonly entrypointId: string;
	readonly kind: KernelInvocationKind;
	readonly stage: KernelExecutionStage;
	readonly timestamp: string;
	readonly metadata?: Readonly<Record<string, unknown>>;
}
