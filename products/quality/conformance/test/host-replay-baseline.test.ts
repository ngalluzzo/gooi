import { describe, expect, test } from "bun:test";
import type { HostReplayRecord } from "@gooi/host-contracts/replay";
import { runHostConformance } from "../src/host-conformance/run-host-conformance";
import { runReplayStoreConformance } from "../src/replay-store-conformance/run-replay-store-conformance";
import { createHostConformanceFixture } from "./fixtures/host-conformance.fixture";

describe("host/replay conformance baseline", () => {
	test("requires host aggregate and replay-store suites in default runner", async () => {
		const hostReport = await runHostConformance(createHostConformanceFixture());
		const replayRecords = new Map<
			string,
			{ readonly inputHash: string; readonly result: unknown }
		>();
		const replayReport = await runReplayStoreConformance({
			createPort: <TResult = unknown>() => ({
				load: async (scopeKey) =>
					(replayRecords.get(scopeKey) as
						| HostReplayRecord<TResult>
						| undefined) ?? null,
				save: async ({ scopeKey, record }) => {
					replayRecords.set(scopeKey, record);
				},
			}),
		});

		expect(hostReport.passed).toBe(true);
		expect(replayReport.passed).toBe(true);
	});
});
