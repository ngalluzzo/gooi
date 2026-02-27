import { describe, expect, test } from "bun:test";
import {
	isKernelExecutionSpineStage,
	kernelExecutionSpineContract,
	resolveKernelExecutionSpine,
} from "../src/execution-spine";

describe("execution spine contract", () => {
	test("shares one prefix for query and mutation orchestration", () => {
		expect(
			kernelExecutionSpineContract.queryOrder.slice(
				0,
				kernelExecutionSpineContract.sharedPrefix.length,
			),
		).toEqual([...kernelExecutionSpineContract.sharedPrefix]);
		expect(
			kernelExecutionSpineContract.mutationOrder.slice(
				0,
				kernelExecutionSpineContract.sharedPrefix.length,
			),
		).toEqual([...kernelExecutionSpineContract.sharedPrefix]);
	});

	test("resolves query order as a deterministic stage list", () => {
		expect(resolveKernelExecutionSpine({ kind: "query" })).toEqual([
			...kernelExecutionSpineContract.queryOrder,
		]);
		expect(kernelExecutionSpineContract.queryOrder).toEqual([
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
			"semantic_engine.execute_query",
			"query_effects.validate",
			"result_envelope.emit",
		]);
	});

	test("exposes mutation idempotency stages without changing query order", () => {
		const withoutIdempotency = resolveKernelExecutionSpine({
			kind: "mutation",
		});
		const withIdempotency = resolveKernelExecutionSpine({
			kind: "mutation",
			includeIdempotencyStages: true,
		});

		expect(withoutIdempotency).toEqual([
			...kernelExecutionSpineContract.mutationOrder,
		]);
		expect(withIdempotency).toEqual([
			...kernelExecutionSpineContract.mutationOrderWithIdempotency,
		]);
		expect(withIdempotency).toContain("idempotency.scope.resolve");
		expect(withIdempotency).toContain("idempotency.replay.lookup");
		expect(withIdempotency.at(-1)).toBe("idempotency.replay.persist");
	});

	test("recognizes valid stage literals for trace typing", () => {
		expect(isKernelExecutionSpineStage("surface_input.bind")).toBe(true);
		expect(isKernelExecutionSpineStage("semantic_engine.execute_query")).toBe(
			true,
		);
		expect(isKernelExecutionSpineStage("made.up.stage")).toBe(false);
	});
});
