import { describe, expect, test } from "bun:test";
import type {
	HostReplayRecord,
	HostReplayStorePort,
} from "@gooi/host-contracts/replay";
import type { ReplayStoreConformanceCheckId } from "../src/replay-store-conformance/contracts";
import { runReplayStoreConformance } from "../src/replay-store-conformance/run-replay-store-conformance";

const expectedCheckOrder: ReplayStoreConformanceCheckId[] = [
	"load_miss_returns_null",
	"save_then_load_roundtrip",
	"scope_isolation_enforced",
	"save_overwrites_existing_scope",
];

const createInMemoryReplayPort = <
	TResult = unknown,
>(): HostReplayStorePort<TResult> => {
	const records = new Map<
		string,
		{ readonly inputHash: string; readonly result: unknown }
	>();
	return {
		load: async (scopeKey: string) =>
			(records.get(scopeKey) as HostReplayRecord<TResult> | undefined) ?? null,
		save: async ({ scopeKey, record }) => {
			records.set(scopeKey, record);
		},
	};
};

describe("replay-store conformance", () => {
	test("passes contract-level replay-store checks", async () => {
		const report = await runReplayStoreConformance({
			createPort: createInMemoryReplayPort,
		});

		expect(report.passed).toBe(true);
		expect(report.checks.every((check) => check.passed)).toBe(true);
	});

	test("returns deterministic check ids in stable order", async () => {
		const first = await runReplayStoreConformance({
			createPort: createInMemoryReplayPort,
		});
		const second = await runReplayStoreConformance({
			createPort: createInMemoryReplayPort,
		});

		expect(first.checks.map((check) => check.id)).toEqual(expectedCheckOrder);
		expect(second.checks.map((check) => check.id)).toEqual(expectedCheckOrder);
		expect(first.checks).toEqual(second.checks);
	});
});
