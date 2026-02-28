/**
 * Canonical boundary contract API.
 */
import * as orchestration from "./orchestration";

export type {
	KernelExecutionStage,
	KernelOrchestrationContract,
	ResolveKernelOrchestrationInput,
} from "./orchestration";

export const orchestrationContracts = Object.freeze({
	kernelOrchestrationContractVersion:
		orchestration.kernelOrchestrationContractVersion,
	kernelOrchestrationContract: orchestration.kernelOrchestrationContract,
	resolveKernelOrchestration: orchestration.resolveKernelOrchestration,
	isKernelExecutionStage: orchestration.isKernelExecutionStage,
});
