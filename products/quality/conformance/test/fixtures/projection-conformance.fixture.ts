import type {
	CompiledAggregateProjectionPlan,
	CompiledTimelineProjectionPlan,
} from "@gooi/projection-contracts/plans/projection-plan";
import type {
	HistoryPort,
	HistoryRecord,
} from "@gooi/projection-contracts/ports/history-port-contract";
import { createProjectionRuntime } from "@gooi/projection-runtime";
import type { ProjectionRefreshSubscriptions } from "@gooi/projection-runtime/refresh";
import {
	timelineMigrationPlanFixture,
	timelineMigrationPlanWithGapFixture,
	versionedHistoryPortFixture,
} from "./projection-conformance-migration.fixture";

const collections: Readonly<
	Record<string, readonly Readonly<Record<string, unknown>>[]>
> = {
	hello_messages: [
		{
			id: "m1",
			user_id: "u1",
			message: "alpha",
			created_at: "2026-02-27T00:00:00.000Z",
		},
		{
			id: "m2",
			user_id: "u1",
			message: "beta",
			created_at: "2026-02-27T00:00:01.000Z",
		},
		{
			id: "m3",
			user_id: "u2",
			message: "gamma",
			created_at: "2026-02-27T00:00:02.000Z",
		},
	],
};

const history: readonly HistoryRecord[] = [
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

const historyPort: HistoryPort = {
	append: async () => undefined,
	scan: async (input) => ({
		records: history.filter((record) =>
			input.signals.includes(record.signalName),
		),
		historyComplete: true,
	}),
	scanAsOf: async (input) => ({
		records: history.filter(
			(record) =>
				input.signals.includes(record.signalName) &&
				record.emittedAt.localeCompare(input.asOf) <= 0,
		),
		historyComplete: true,
	}),
	rebuild: async () => undefined,
	persist: async () => undefined,
};

const historyPortWithoutAsOf: Omit<HistoryPort, "scanAsOf"> = {
	append: historyPort.append,
	scan: historyPort.scan,
	rebuild: historyPort.rebuild,
	persist: historyPort.persist,
};

const historyPortWithoutPersist: Omit<HistoryPort, "persist"> = {
	append: historyPort.append,
	scan: historyPort.scan,
	scanAsOf: async (input) => {
		if (historyPort.scanAsOf === undefined) {
			return { records: [], historyComplete: false };
		}
		return historyPort.scanAsOf(input);
	},
	rebuild: historyPort.rebuild,
};

const aggregatePlan: CompiledAggregateProjectionPlan = {
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
		defaultPageSize: 20,
		maxPageSize: 100,
	},
};

const timelinePlan: CompiledTimelineProjectionPlan = {
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

const refreshSubscriptions: ProjectionRefreshSubscriptions = {
	get_user_activity: {
		queryId: "get_user_activity",
		signalIds: ["message.created", "message.rejected"],
	},
	list_recent_messages: {
		queryId: "list_recent_messages",
		signalIds: ["message.created"],
	},
};

/**
 * Builds projection conformance fixture input.
 */
export const createProjectionConformanceFixture = () => ({
	runtime: createProjectionRuntime(),
	aggregatePlan,
	timelinePlan,
	timelineMigrationPlan: timelineMigrationPlanFixture,
	timelineMigrationPlanWithGap: timelineMigrationPlanWithGapFixture,
	collectionReader: {
		scanCollection: async ({
			collectionId,
		}: {
			readonly collectionId: string;
		}) => collections[collectionId] ?? [],
	},
	historyPort,
	historyPortWithoutAsOf,
	historyPortWithoutPersist,
	versionedHistoryPort: versionedHistoryPortFixture,
	refreshSubscriptions,
	emittedSignalIds: ["message.created", "message.rejected"],
	expectedAffectedQueryIds: ["get_user_activity", "list_recent_messages"],
	expectedAggregateRows: [
		{ user_id: "u1", message_count: 2 },
		{ user_id: "u2", message_count: 1 },
	],
});
