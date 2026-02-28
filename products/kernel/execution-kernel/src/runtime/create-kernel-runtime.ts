import { portsetContracts } from "@gooi/host-contracts/portset";
import type {
	KernelRuntime,
	CreateKernelRuntimeInput as SharedCreateKernelRuntimeInput,
} from "@gooi/kernel-contracts/runtime";
import { createKernelTraceEnvelope } from "../trace/trace";
export type CreateKernelRuntimeInput = SharedCreateKernelRuntimeInput;
const { HostPortSetValidationError, parseHostPortSet } = portsetContracts;

const defaultNowIso = (): string => new Date().toISOString();

export const createKernelRuntime = (
	input: CreateKernelRuntimeInput,
): KernelRuntime => ({
	invoke: async (call) => {
		try {
			const hostPorts = parseHostPortSet(call.hostPorts);
			return input.invoke({ call, hostPorts });
		} catch (error) {
			if (error instanceof HostPortSetValidationError) {
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
