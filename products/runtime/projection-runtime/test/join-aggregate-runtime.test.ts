import { describe, expect, test } from "bun:test";
import { createProjectionRuntime } from "../src/execute/execute-projection";
import {
	createAggregatePlanFixture,
	createCollectionReaderFixture,
	createJoinPlanFixture,
} from "./fixtures/projection-runtime.fixture";

describe("projection-runtime join and aggregate semantics", () => {
	test("executes deterministic join ordering with tie handling", async () => {
		const runtime = createProjectionRuntime();
		const result = await runtime.executeProjection({
			plan: createJoinPlanFixture(),
			args: { page: 1, page_size: 10 },
			artifactHash: "artifact_join_1",
			collectionReader: createCollectionReaderFixture(),
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.rows?.map((row) => row.id)).toEqual(["m1", "m2", "m3"]);
		expect(result.meta?.strategy).toBe("join");
		expect(result.meta?.pagination.totalRows).toBe(3);
	});

	test("executes deterministic aggregate grouping and metric sorting", async () => {
		const runtime = createProjectionRuntime();
		const result = await runtime.executeProjection({
			plan: createAggregatePlanFixture(),
			args: { page: 1, page_size: 10 },
			artifactHash: "artifact_agg_1",
			collectionReader: createCollectionReaderFixture(),
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.rows).toEqual([
			{ user_id: "u1", message_count: 2 },
			{ user_id: "u2", message_count: 1 },
		]);
		expect(result.meta?.strategy).toBe("aggregate");
	});

	test("returns typed diagnostics with source references on projection failure", async () => {
		const runtime = createProjectionRuntime();
		const result = await runtime.executeProjection({
			plan: createJoinPlanFixture(),
			args: { page: 1, page_size: 5000 },
			artifactHash: "artifact_join_2",
			collectionReader: createCollectionReaderFixture(),
		});

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.error?.code).toBe("projection_pagination_error");
		expect(result.error?.sourceRef.path).toContain("messages_with_authors");
	});
});
