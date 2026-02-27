import type { KernelInvokeInput } from "./invoke";

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

export type KernelExecutionSpineStage = (typeof allStages)[number];

export interface KernelExecutionSpineContract {
	readonly version: string;
	readonly sharedPrefix: readonly KernelExecutionSpineStage[];
	readonly queryOrder: readonly KernelExecutionSpineStage[];
	readonly mutationOrder: readonly KernelExecutionSpineStage[];
	readonly mutationIdempotencyStages: readonly KernelExecutionSpineStage[];
	readonly mutationOrderWithIdempotency: readonly KernelExecutionSpineStage[];
}

export const kernelExecutionSpineContractVersion = "2026-02-27";

export const kernelExecutionSpineContract: KernelExecutionSpineContract = {
	version: kernelExecutionSpineContractVersion,
	sharedPrefix,
	queryOrder,
	mutationOrder,
	mutationIdempotencyStages,
	mutationOrderWithIdempotency,
};

export interface ResolveKernelExecutionSpineInput {
	readonly kind: KernelInvokeInput["kind"];
	readonly includeIdempotencyStages?: boolean;
}

export const resolveKernelExecutionSpine = (
	input: ResolveKernelExecutionSpineInput,
): readonly KernelExecutionSpineStage[] =>
	input.kind === "query"
		? kernelExecutionSpineContract.queryOrder
		: input.includeIdempotencyStages
			? kernelExecutionSpineContract.mutationOrderWithIdempotency
			: kernelExecutionSpineContract.mutationOrder;

export const isKernelExecutionSpineStage = (
	value: string,
): value is KernelExecutionSpineStage =>
	(allStages as readonly string[]).includes(value);
