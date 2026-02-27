import type { HostPortSet } from "@gooi/host-contracts/portset";
import type {
	KernelInvokeInput,
	KernelInvokeResult,
} from "@gooi/kernel-contracts/invocation";
import type {
	KernelTraceEnvelope,
	KernelTraceInput,
} from "@gooi/kernel-contracts/trace";

export interface KernelRuntime {
	readonly invoke: (input: KernelInvokeInput) => Promise<KernelInvokeResult>;
	readonly trace: (input: KernelTraceInput) => KernelTraceEnvelope;
}

export interface CreateKernelRuntimeInput {
	readonly invoke: (input: {
		readonly call: KernelInvokeInput;
		readonly hostPorts: HostPortSet;
	}) => Promise<KernelInvokeResult>;
	readonly nowIso?: () => string;
}
