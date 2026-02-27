import { describe, expect, test } from "bun:test";
import type { HistoryPort } from "@gooi/projection-contracts/ports/history-port-contract";
import { createProjectionRuntime } from "../src/execute/execute-projection";
import {
	createCollectionReaderFixture,
	createHistoryPortFixture,
	createTimelinePlanFixture,
} from "./fixtures/projection-runtime.fixture";

describe("projection-runtime timeline history contracts", () => {
	test("fails fast when required history operations are missing", async () => {
		const runtime = createProjectionRuntime();
		const historyPort = createHistoryPortFixture();
		const missingPersist = {
			append: historyPort.append,
			scan: historyPort.scan,
			scanAsOf: historyPort.scanAsOf,
			rebuild: historyPort.rebuild,
		} as unknown as HistoryPort;

		const result = await runtime.executeProjection({
			plan: createTimelinePlanFixture(),
			args: { page: 1, page_size: 10 },
			collectionReader: createCollectionReaderFixture(),
			historyPort: missingPersist,
		});

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.error?.code).toBe("projection_history_capability_error");
		expect(result.error?.details).toEqual({
			missingCapabilities: ["history.persist"],
		});
	});

	test("fails as_of timeline execution when history.scan_as_of is unavailable", async () => {
		const runtime = createProjectionRuntime();
		const historyPort = createHistoryPortFixture();
		const withoutAsOf = {
			append: historyPort.append,
			scan: historyPort.scan,
			rebuild: historyPort.rebuild,
			persist: historyPort.persist,
		} as unknown as HistoryPort;

		const result = await runtime.executeProjection({
			plan: createTimelinePlanFixture(),
			args: { page: 1, page_size: 10 },
			asOf: "2026-02-27T00:00:01.000Z",
			collectionReader: createCollectionReaderFixture(),
			historyPort: withoutAsOf,
		});

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.error?.code).toBe("projection_history_capability_error");
		expect(result.error?.details).toEqual({
			missingCapabilities: ["history.scan_as_of"],
		});
	});
});
