import { describe, expect, test } from "bun:test";
import type { CompiledTimelineProjectionPlan } from "@gooi/projection-contracts/plans/projection-plan";
import type {
	HistoryPort,
	HistoryRecord,
} from "@gooi/projection-contracts/ports/history-port-contract";
import { createProjectionRuntime } from "../src/execute/execute-projection";
import {
	createCollectionReaderFixture,
	createTimelinePlanFixture,
} from "./fixtures/projection-runtime.fixture";

const versionedHistoryRecords: readonly HistoryRecord[] = [
	{
		signalName: "message.created",
		signalVersion: 1,
		eventKey: "evt_v1",
		emittedAt: "2026-02-27T00:00:00.000Z",
		traceId: "trace_v1",
		payload: {
			user_id: "u1",
			message: "alpha",
			priority: "2",
		},
	},
	{
		signalName: "message.created",
		signalVersion: 2,
		eventKey: "evt_v2",
		emittedAt: "2026-02-27T00:00:01.000Z",
		traceId: "trace_v2",
		payload: {
			user_id: "u1",
			text: "beta",
			channel: "sms",
			priority: "5",
		},
	},
];

const createVersionedHistoryPort = (): HistoryPort => ({
	append: async () => undefined,
	scan: async () => ({
		records: versionedHistoryRecords,
		historyComplete: true,
	}),
	scanAsOf: async (input) => ({
		records: versionedHistoryRecords.filter(
			(record) => record.emittedAt.localeCompare(input.asOf) <= 0,
		),
		historyComplete: true,
	}),
	rebuild: async () => undefined,
	persist: async () => undefined,
});

const createMigrationPlan = (): CompiledTimelineProjectionPlan => {
	const base = createTimelinePlanFixture();
	return {
		...base,
		reducers: {
			"message.created": [
				{ op: "inc", field: "message_count", value: 1 },
				{
					op: "set",
					field: "last_message",
					valueFrom: "payload",
					path: "payload.text",
				},
				{
					op: "set",
					field: "last_channel",
					valueFrom: "payload",
					path: "payload.channel",
				},
				{
					op: "set",
					field: "last_priority",
					valueFrom: "payload",
					path: "payload.priority",
				},
			],
			"message.rejected": [{ op: "inc", field: "rejection_count", value: 1 }],
		},
		signalReplay: {
			"message.created": {
				currentVersion: 3,
				oldestRetainedVersion: 1,
				steps: [
					{
						fromVersion: 1,
						toVersion: 2,
						operations: [
							{ op: "rename", from: "message", to: "text" },
							{ op: "set", field: "channel", value: "direct" },
						],
					},
					{
						fromVersion: 2,
						toVersion: 3,
						operations: [{ op: "coerce", field: "priority", to: "number" }],
					},
				],
			},
			"message.rejected": {
				currentVersion: 1,
				oldestRetainedVersion: 1,
				steps: [],
			},
		},
	};
};

describe("projection-runtime timeline signal migrations", () => {
	test("applies cumulative migration chains before reducers (additive, breaking, type-change)", async () => {
		const runtime = createProjectionRuntime();
		const result = await runtime.executeProjection({
			plan: createMigrationPlan(),
			args: { page: 1, page_size: 10 },
			artifactHash: "artifact_timeline_migration_1",
			collectionReader: createCollectionReaderFixture(),
			historyPort: createVersionedHistoryPort(),
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.rows).toEqual([
			{
				message_count: 2,
				rejection_count: 0,
				last_message: "beta",
				last_channel: "sms",
				last_priority: 5,
				user_id: "u1",
			},
		]);
	});

	test("fails when migration chain segments are missing", async () => {
		const runtime = createProjectionRuntime();
		const plan = createMigrationPlan();
		const planWithGap: CompiledTimelineProjectionPlan = {
			...plan,
			signalReplay: {
				...plan.signalReplay,
				"message.created": {
					currentVersion: 3,
					oldestRetainedVersion: 1,
					steps: [
						{
							fromVersion: 1,
							toVersion: 2,
							operations: [{ op: "rename", from: "message", to: "text" }],
						},
					],
				},
			},
		};

		const result = await runtime.executeProjection({
			plan: planWithGap,
			args: { page: 1, page_size: 10 },
			artifactHash: "artifact_timeline_migration_2",
			collectionReader: createCollectionReaderFixture(),
			historyPort: createVersionedHistoryPort(),
		});

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.error?.code).toBe("projection_signal_migration_error");
	});
});
