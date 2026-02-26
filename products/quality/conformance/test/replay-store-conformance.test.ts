import { describe, expect, test } from "bun:test";
import type { HostReplayRecord } from "@gooi/host-contracts/replay";
import { runReplayStoreConformance } from "../src/replay-store-conformance/run-replay-store-conformance";

describe("replay-store conformance", () => {
	test("passes contract-level replay-store checks", async () => {
		const records = new Map<
			string,
			{ readonly inputHash: string; readonly result: unknown }
		>();
		const report = await runReplayStoreConformance({
			createPort: <TResult = unknown>() => ({
				load: async (scopeKey) =>
					(records.get(scopeKey) as HostReplayRecord<TResult> | undefined) ??
					null,
				save: async ({ scopeKey, record }) => {
					records.set(scopeKey, record);
				},
			}),
		});

		expect(report.passed).toBe(true);
		expect(report.checks.every((check) => check.passed)).toBe(true);
	});
});
