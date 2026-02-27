import {
	type KernelHostPortSet,
	KernelHostPortSetValidationError,
	parseKernelHostPortSet,
} from "@gooi/kernel-host-bridge/host-portset";
import type { KernelInvokeInput, KernelInvokeResult } from "./invoke";
import {
	createKernelTraceEnvelope,
	type KernelTraceEnvelope,
	type KernelTraceInput,
} from "./trace";

export interface KernelRuntime {
	readonly invoke: (input: KernelInvokeInput) => Promise<KernelInvokeResult>;
	readonly trace: (input: KernelTraceInput) => KernelTraceEnvelope;
}

export interface CreateKernelRuntimeInput {
	readonly invoke: (input: {
		readonly call: KernelInvokeInput;
		readonly hostPorts: KernelHostPortSet;
	}) => Promise<KernelInvokeResult>;
	readonly nowIso?: () => string;
}

const defaultNowIso = (): string => new Date().toISOString();

export const createKernelRuntime = (
	input: CreateKernelRuntimeInput,
): KernelRuntime => ({
	invoke: async (call) => {
		try {
			const hostPorts = parseKernelHostPortSet(call.hostPorts);
			return input.invoke({ call, hostPorts });
		} catch (error) {
			if (error instanceof KernelHostPortSetValidationError) {
				return {
					ok: false,
					error: {
						code: "validation_error",
						message: error.message,
						details: error.details,
					},
				};
			}

			throw error;
		}
	},
	trace: (traceInput) =>
		createKernelTraceEnvelope(traceInput, (input.nowIso ?? defaultNowIso)()),
});
