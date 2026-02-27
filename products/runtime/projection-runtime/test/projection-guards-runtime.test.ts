import { describe, expect, test } from "bun:test";
import type { CompiledInvariantDefinition } from "@gooi/guard-contracts/plans/guard-plan";
import { createProjectionRuntime } from "../src/execute/execute-projection";
import {
	createCollectionReaderFixture,
	createJoinPlanFixture,
} from "./fixtures/projection-runtime.fixture";

const createProjectionGuard = (
	onFail: CompiledInvariantDefinition["onFail"],
): CompiledInvariantDefinition => ({
	sourceRef: {
		primitiveKind: "projection",
		primitiveId: "messages_with_authors",
		path: "domain.projections.messages_with_authors.guards",
	},
	onFail,
	structural: [
		{
			guardId: "projection.row.has_runtime_flag",
			description: "projection row carries runtime-only flag",
			operator: "exists",
			left: { kind: "path", path: "row.runtime_only_flag" },
		},
	],
});

describe("projection-runtime projection guard enforcement", () => {
	test("continues with guard diagnostics for log-and-continue projection policy", async () => {
		const runtime = createProjectionRuntime();
		const result = await runtime.executeProjection({
			plan: {
				...createJoinPlanFixture(),
				guard: createProjectionGuard("log_and_continue"),
			},
			args: { page: 1, page_size: 10 },
			artifactHash: "artifact_projection_guard_1",
			collectionReader: createCollectionReaderFixture(),
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.meta?.guards).toMatchObject({
			evaluatedRows: 3,
			violationCount: 3,
			diagnosticCount: 0,
			emittedViolationSignalCount: 0,
		});
		expect(result.meta?.guards?.violations.length).toBe(3);
		expect(result.meta?.guards?.diagnostics.length).toBe(0);
		expect(result.meta?.guards?.emittedViolationSignals.length).toBe(0);
	});

	test("fails with typed projection guard error when policy is abort", async () => {
		const runtime = createProjectionRuntime();
		const result = await runtime.executeProjection({
			plan: {
				...createJoinPlanFixture(),
				guard: createProjectionGuard("abort"),
			},
			args: { page: 1, page_size: 10 },
			artifactHash: "artifact_projection_guard_2",
			collectionReader: createCollectionReaderFixture(),
		});

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.error?.code).toBe("projection_guard_error");
		expect(result.error?.details?.rowIndex).toBe(0);
	});
});
