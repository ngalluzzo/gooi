import type { CompiledTimelineProjectionPlan } from "@gooi/projection-contracts/plans/projection-plan";
import type {
	HistoryPort,
	HistoryRecord,
} from "@gooi/projection-contracts/ports/history-port-contract";

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

export const versionedHistoryPortFixture: HistoryPort = {
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
};

const migrationBasePlan: CompiledTimelineProjectionPlan = {
	projectionId: "user_message_state_timeline_migration",
	strategy: "timeline",
	sourceRef: {
		projectionId: "user_message_state_timeline_migration",
		path: "domain.projections.user_message_state_timeline_migration",
		strategy: "timeline",
	},
	signals: ["message.created", "message.rejected"],
	groupByField: "payload.user_id",
	orderBy: { field: "emittedAt", direction: "asc" },
	start: {
		message_count: 0,
		rejection_count: 0,
		last_message: null,
		last_channel: null,
		last_priority: null,
	},
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
	pagination: {
		mode: "page",
		pageArg: "page",
		pageSizeArg: "page_size",
		defaultPage: 1,
		defaultPageSize: 20,
		maxPageSize: 100,
	},
	history: {
		requiredCapabilities: [
			"history.scan",
			"history.rebuild",
			"history.persist",
		],
		window: {
			defaultLimit: 100,
			maxLimit: 100,
			limitArg: "limit",
			afterEventKeyArg: "after",
		},
		rebuild: { mode: "full" },
	},
};

export const timelineMigrationPlanFixture: CompiledTimelineProjectionPlan =
	migrationBasePlan;

export const timelineMigrationPlanWithGapFixture: CompiledTimelineProjectionPlan =
	{
		...migrationBasePlan,
		signalReplay: {
			...migrationBasePlan.signalReplay,
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
