import type { KernelInvocationKind } from "@gooi/kernel-contracts/invocation";

const sharedPrefix = [
	"host_ports.resolve",
	"replay_ttl.validate",
	"host_ports.validate",
	"invocation_envelope.initialize",
	"artifact_manifest.validate",
	"entrypoint.resolve",
	"surface_input.bind",
	"schema_profile.validate",
	"entrypoint_input.validate",
	"policy_gate.evaluate",
] as const;

const querySuffix = [
	"semantic_engine.execute_query",
	"query_effects.validate",
	"result_envelope.emit",
] as const;

const mutationSuffix = [
	"semantic_engine.execute_mutation",
	"result_envelope.emit",
] as const;

const mutationIdempotencyStages = [
	"idempotency.scope.resolve",
	"idempotency.replay.lookup",
	"idempotency.replay.persist",
] as const;

const queryOrder = [...sharedPrefix, ...querySuffix] as const;
const mutationOrder = [...sharedPrefix, ...mutationSuffix] as const;
const mutationOrderWithIdempotency = [
	...sharedPrefix,
	"idempotency.scope.resolve",
	"idempotency.replay.lookup",
	"semantic_engine.execute_mutation",
	"result_envelope.emit",
	"idempotency.replay.persist",
] as const;

const allStages = [...queryOrder, ...mutationOrderWithIdempotency] as const;

export type KernelExecutionStage = (typeof allStages)[number];

export interface KernelOrchestrationContract {
	readonly version: string;
	readonly sharedPrefix: readonly KernelExecutionStage[];
	readonly queryOrder: readonly KernelExecutionStage[];
	readonly mutationOrder: readonly KernelExecutionStage[];
	readonly mutationIdempotencyStages: readonly KernelExecutionStage[];
	readonly mutationOrderWithIdempotency: readonly KernelExecutionStage[];
}

export const kernelOrchestrationContractVersion = "2026-02-27";

export const kernelOrchestrationContract: KernelOrchestrationContract = {
	version: kernelOrchestrationContractVersion,
	sharedPrefix,
	queryOrder,
	mutationOrder,
	mutationIdempotencyStages,
	mutationOrderWithIdempotency,
};

export interface ResolveKernelOrchestrationInput {
	readonly kind: KernelInvocationKind;
	readonly includeIdempotencyStages?: boolean;
}

export const resolveKernelOrchestration = (
	input: ResolveKernelOrchestrationInput,
): readonly KernelExecutionStage[] =>
	input.kind === "query"
		? kernelOrchestrationContract.queryOrder
		: input.includeIdempotencyStages
			? kernelOrchestrationContract.mutationOrderWithIdempotency
			: kernelOrchestrationContract.mutationOrder;

export const isKernelExecutionStage = (
	value: string,
): value is KernelExecutionStage =>
	(allStages as readonly string[]).includes(value);
