import type {
	CompiledAggregateProjectionPlan,
	CompiledJoinProjectionPlan,
	CompiledTimelineProjectionPlan,
} from "@gooi/projection-contracts/plans";
import type {
	HistoryPort,
	HistoryRecord,
} from "@gooi/projection-contracts/ports";
import type { ProjectionCollectionReaderPort } from "../../src/ports/collection-reader";

const collections: Readonly<
	Record<string, readonly Readonly<Record<string, unknown>>[]>
> = {
	hello_messages: [
		{
			id: "m2",
			user_id: "u1",
			message: "beta",
			created_at: "2026-02-27T00:00:00.000Z",
		},
		{
			id: "m1",
			user_id: "u1",
			message: "alpha",
			created_at: "2026-02-27T00:00:00.000Z",
		},
		{
			id: "m3",
			user_id: "u2",
			message: "gamma",
			created_at: "2026-02-28T00:00:00.000Z",
		},
	],
	users: [
		{ id: "u1", name: "Ava" },
		{ id: "u2", name: "Ben" },
	],
};

const historyRecords: readonly HistoryRecord[] = [
	{
		signalName: "message.created",
		signalVersion: 1,
		eventKey: "evt_1",
		emittedAt: "2026-02-27T00:00:00.000Z",
		traceId: "trace_1",
		payload: { user_id: "u1", message: "alpha" },
	},
	{
		signalName: "message.created",
		signalVersion: 1,
		eventKey: "evt_2",
		emittedAt: "2026-02-27T00:00:01.000Z",
		traceId: "trace_2",
		payload: { user_id: "u1", message: "beta" },
	},
	{
		signalName: "message.rejected",
		signalVersion: 1,
		eventKey: "evt_3",
		emittedAt: "2026-02-27T00:00:02.000Z",
		traceId: "trace_3",
		payload: { user_id: "u1" },
	},
	{
		signalName: "message.created",
		signalVersion: 1,
		eventKey: "evt_2",
		emittedAt: "2026-02-27T00:00:01.000Z",
		traceId: "trace_2",
		payload: { user_id: "u1", message: "beta" },
	},
];

export const createCollectionReaderFixture =
	(): ProjectionCollectionReaderPort => ({
		scanCollection: async ({ collectionId }) => collections[collectionId] ?? [],
	});

export const createHistoryPortFixture = (): HistoryPort => ({
	append: async () => undefined,
	scan: async (input) => {
		const ordered = historyRecords
			.filter((record) => input.signals.includes(record.signalName))
			.sort((left, right) => left.emittedAt.localeCompare(right.emittedAt));
		const index =
			input.afterEventKey === undefined
				? 0
				: Math.max(
						ordered.findIndex(
							(record) => record.eventKey === input.afterEventKey,
						) + 1,
						0,
					);
		const limit = input.limit ?? ordered.length;
		const records = ordered.slice(index, index + limit);
		const next = ordered[index + limit - 1]?.eventKey;
		return {
			records,
			...(next === undefined ? {} : { nextAfterEventKey: next }),
			historyComplete: true,
		};
	},
	scanAsOf: async (input) => {
		const records = historyRecords
			.filter(
				(record) =>
					input.signals.includes(record.signalName) &&
					record.emittedAt.localeCompare(input.asOf) <= 0,
			)
			.sort((left, right) => left.emittedAt.localeCompare(right.emittedAt));
		return {
			records,
			historyComplete: true,
		};
	},
	rebuild: async () => undefined,
	persist: async () => undefined,
});

export const createJoinPlanFixture = (): CompiledJoinProjectionPlan => ({
	projectionId: "messages_with_authors",
	strategy: "join",
	sourceRef: {
		projectionId: "messages_with_authors",
		path: "domain.projections.messages_with_authors",
		strategy: "join",
	},
	primary: { collectionId: "hello_messages", alias: "m" },
	joins: [
		{
			collectionId: "users",
			alias: "u",
			type: "left",
			on: { leftField: "m.user_id", rightField: "id" },
		},
	],
	fields: [
		{ source: "m.id", as: "id" },
		{ source: "m.created_at", as: "created_at" },
		{ source: "u.name", as: "author_name" },
	],
	sort: [
		{ field: "created_at", direction: "asc" },
		{ field: "id", direction: "asc" },
	],
	pagination: {
		mode: "page",
		pageArg: "page",
		pageSizeArg: "page_size",
		defaultPage: 1,
		defaultPageSize: 10,
		maxPageSize: 50,
	},
});

export const createAggregatePlanFixture =
	(): CompiledAggregateProjectionPlan => ({
		projectionId: "user_activity",
		strategy: "aggregate",
		sourceRef: {
			projectionId: "user_activity",
			path: "domain.projections.user_activity",
			strategy: "aggregate",
		},
		primary: { collectionId: "hello_messages", alias: "m" },
		joins: [],
		groupBy: [{ field: "m.user_id", as: "user_id" }],
		metrics: [{ metricId: "message_count", op: "count" }],
		sort: [
			{ field: "message_count", direction: "desc" },
			{ field: "user_id", direction: "asc" },
		],
		pagination: {
			mode: "page",
			pageArg: "page",
			pageSizeArg: "page_size",
			defaultPage: 1,
			defaultPageSize: 10,
			maxPageSize: 50,
		},
	});

export const createTimelinePlanFixture =
	(): CompiledTimelineProjectionPlan => ({
		projectionId: "user_message_state_timeline",
		strategy: "timeline",
		sourceRef: {
			projectionId: "user_message_state_timeline",
			path: "domain.projections.user_message_state_timeline",
			strategy: "timeline",
		},
		signals: ["message.created", "message.rejected"],
		groupByField: "payload.user_id",
		orderBy: { field: "emittedAt", direction: "asc" },
		start: { message_count: 0, rejection_count: 0, last_message: null },
		reducers: {
			"message.created": [
				{ op: "inc", field: "message_count", value: 1 },
				{
					op: "set",
					field: "last_message",
					valueFrom: "payload",
					path: "payload.message",
				},
			],
			"message.rejected": [{ op: "inc", field: "rejection_count", value: 1 }],
		},
		signalReplay: {
			"message.created": {
				currentVersion: 1,
				oldestRetainedVersion: 1,
				steps: [],
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
			defaultPageSize: 10,
			maxPageSize: 50,
		},
		history: {
			requiredCapabilities: [
				"history.scan",
				"history.rebuild",
				"history.persist",
			],
			window: {
				afterEventKeyArg: "after",
				limitArg: "limit",
				defaultLimit: 100,
				maxLimit: 100,
			},
			rebuild: { mode: "full" },
		},
	});
