import { describe, expect, test } from "bun:test";
import { createProjectionRuntime } from "../src/execute/execute-projection";
import {
	createCollectionReaderFixture,
	createHistoryPortFixture,
	createTimelinePlanFixture,
} from "./fixtures/projection-runtime.fixture";

describe("projection-runtime timeline rebuild workflow", () => {
	test("restores queryability after stale accumulation drift via explicit rebuild", async () => {
		const runtime = createProjectionRuntime();
		const plan = createTimelinePlanFixture();
		const historyPort = createHistoryPortFixture();
		const collectionReader = createCollectionReaderFixture();

		const stale = await runtime.executeProjection({
			plan,
			args: { page: 1, page_size: 10 },
			collectionReader,
			historyPort,
			timelineState: {
				compiledAccumulationHash: "hash_compiled_next",
				persistedAccumulationHash: "hash_compiled_prev",
				rebuildStatus: "stale",
				rebuildProgress: null,
				rebuildStartedAt: null,
				historyComplete: true,
			},
		});

		expect(stale.ok).toBe(false);
		if (stale.ok) {
			return;
		}
		expect(stale.error?.code).toBe("projection_rebuild_required_error");

		const rebuild = await runtime.rebuildTimelineProjection({
			plan,
			historyPort,
			compiledAccumulationHash: "hash_compiled_next",
			rebuildStartedAt: "2026-02-27T01:00:00.000Z",
		});

		expect(rebuild.ok).toBe(true);
		if (!rebuild.ok) {
			return;
		}
		expect(rebuild.timelineState).toEqual({
			compiledAccumulationHash: "hash_compiled_next",
			persistedAccumulationHash: "hash_compiled_next",
			rebuildStatus: "complete",
			rebuildProgress: null,
			rebuildStartedAt: "2026-02-27T01:00:00.000Z",
			historyComplete: true,
		});
		expect(rebuild.persistedRowCount).toBe(1);

		const recovered = await runtime.executeProjection({
			plan,
			args: { page: 1, page_size: 10, limit: 100 },
			collectionReader,
			historyPort,
			timelineState: rebuild.timelineState,
		});

		expect(recovered.ok).toBe(true);
		if (!recovered.ok) {
			return;
		}
		expect(recovered.timeline?.rebuildStatus).toBe("complete");
		expect(recovered.rows).toEqual([
			{
				message_count: 2,
				rejection_count: 1,
				last_message: "beta",
				user_id: "u1",
			},
		]);
	});
});
