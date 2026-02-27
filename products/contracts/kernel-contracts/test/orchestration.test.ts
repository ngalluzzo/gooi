import { describe, expect, test } from "bun:test";
import {
	isKernelExecutionStage,
	kernelOrchestrationContract,
	resolveKernelOrchestration,
} from "../src/orchestration/orchestration";

describe("kernel orchestration contract", () => {
	test("shares one prefix for query and mutation", () => {
		expect(
			kernelOrchestrationContract.queryOrder.slice(
				0,
				kernelOrchestrationContract.sharedPrefix.length,
			),
		).toEqual([...kernelOrchestrationContract.sharedPrefix]);
		expect(
			kernelOrchestrationContract.mutationOrder.slice(
				0,
				kernelOrchestrationContract.sharedPrefix.length,
			),
		).toEqual([...kernelOrchestrationContract.sharedPrefix]);
	});

	test("resolves query and mutation order deterministically", () => {
		expect(resolveKernelOrchestration({ kind: "query" })).toEqual([
			...kernelOrchestrationContract.queryOrder,
		]);
		expect(resolveKernelOrchestration({ kind: "mutation" })).toEqual([
			...kernelOrchestrationContract.mutationOrder,
		]);
		expect(
			resolveKernelOrchestration({
				kind: "mutation",
				includeIdempotencyStages: true,
			}),
		).toEqual([...kernelOrchestrationContract.mutationOrderWithIdempotency]);
	});

	test("validates stage literals for trace typing", () => {
		expect(isKernelExecutionStage("surface_input.bind")).toBe(true);
		expect(isKernelExecutionStage("semantic_engine.execute_query")).toBe(true);
		expect(isKernelExecutionStage("not.real")).toBe(false);
	});
});
