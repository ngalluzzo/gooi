import { describe, expect, test } from "bun:test";
import { createProjectionRuntime } from "../src/execute/execute-projection";
import {
	createCollectionReaderFixture,
	createHistoryPortFixture,
	createTimelinePlanFixture,
} from "./fixtures/projection-runtime.fixture";

describe("projection-runtime timeline and history semantics", () => {
	test("preserves deterministic timeline ordering across identical inputs", async () => {
		const runtime = createProjectionRuntime();
		const baseInput = {
			plan: createTimelinePlanFixture(),
			args: { page: 1, page_size: 10, limit: 100 },
			collectionReader: createCollectionReaderFixture(),
			historyPort: createHistoryPortFixture(),
		};

		const first = await runtime.executeProjection(baseInput);
		const second = await runtime.executeProjection(baseInput);

		expect(first).toEqual(second);
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}
		expect(first.rows).toEqual([
			{
				message_count: 2,
				rejection_count: 1,
				last_message: "beta",
				user_id: "u1",
			},
		]);
	});

	test("keeps history windows and pagination semantics stable", async () => {
		const runtime = createProjectionRuntime();
		const result = await runtime.executeProjection({
			plan: createTimelinePlanFixture(),
			args: { page: 1, page_size: 1, limit: 1 },
			collectionReader: createCollectionReaderFixture(),
			historyPort: createHistoryPortFixture(),
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.pagination).toEqual({
			mode: "page",
			page: 1,
			pageSize: 1,
			totalRows: 1,
			totalPages: 1,
		});
	});

	test("returns timeline artifacts compatible with query/view consumers", async () => {
		const runtime = createProjectionRuntime();
		const result = await runtime.executeProjection({
			plan: createTimelinePlanFixture(),
			args: { page: 1, page_size: 10 },
			asOf: "2026-02-27T00:00:01.000Z",
			collectionReader: createCollectionReaderFixture(),
			historyPort: createHistoryPortFixture(),
			timelineState: {
				compiledAccumulationHash: "hash_a",
				persistedAccumulationHash: "hash_a",
				rebuildStatus: "complete",
				rebuildProgress: null,
				rebuildStartedAt: null,
				historyComplete: true,
			},
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.timeline).toEqual({
			rebuildStatus: "complete",
			rebuildProgress: null,
			rebuildStartedAt: null,
			historyComplete: true,
			asOfApplied: "2026-02-27T00:00:01.000Z",
		});
		expect(Array.isArray(result.rows)).toBe(true);
	});
});
