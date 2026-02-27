import {
	isKernelExecutionStage,
	type KernelExecutionStage,
	type KernelOrchestrationContract,
	kernelOrchestrationContract,
	kernelOrchestrationContractVersion,
	type ResolveKernelOrchestrationInput,
	resolveKernelOrchestration,
} from "@gooi/kernel-contracts/orchestration";

export type KernelExecutionSpineStage = KernelExecutionStage;
export type KernelExecutionSpineContract = KernelOrchestrationContract;
export type ResolveKernelExecutionSpineInput = ResolveKernelOrchestrationInput;

export const kernelExecutionSpineContractVersion =
	kernelOrchestrationContractVersion;

export const kernelExecutionSpineContract: KernelExecutionSpineContract =
	kernelOrchestrationContract;

export const resolveKernelExecutionSpine = (
	input: ResolveKernelExecutionSpineInput,
): readonly KernelExecutionSpineStage[] => resolveKernelOrchestration(input);

export const isKernelExecutionSpineStage = (
	value: string,
): value is KernelExecutionSpineStage => isKernelExecutionStage(value);
