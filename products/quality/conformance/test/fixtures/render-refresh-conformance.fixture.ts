import type { RunRenderRefreshConformanceInput } from "../../src/render-refresh-conformance/contracts";

/**
 * Builds render refresh lifecycle conformance fixture input.
 */
export const createRenderRefreshConformanceFixture =
	(): RunRenderRefreshConformanceInput => ({
		viewRenderIR: {
			artifactVersion: "1.0.0",
			screens: {
				dashboard: {
					id: "dashboard",
					data: {
						alerts: {
							queryId: "list_alerts",
							refreshOnSignals: ["alert.raised"],
						},
						feed: {
							queryId: "list_messages",
							refreshOnSignals: ["message.created"],
						},
					},
					rootNodeIds: [],
				},
				home: {
					id: "home",
					data: {
						messages: {
							queryId: "list_messages",
							refreshOnSignals: ["message.created", "message.deleted"],
						},
					},
					rootNodeIds: [],
				},
			},
			nodes: {},
			screenOrder: ["dashboard", "home"],
			nodeOrder: [],
			nodeIntentPlans: {},
		},
		refreshTriggers: [
			{
				signalId: "message.deleted",
				signalVersion: 2,
				payloadHash: "hash_deleted",
			},
			{
				signalId: "alert.raised",
				signalVersion: 1,
				payloadHash: "hash_alert",
			},
			{
				signalId: "message.created",
				signalVersion: 3,
				payloadHash: "hash_created",
			},
		],
		runtimeAffectedQueryIds: ["list_alerts", "list_messages"],
		driftedRuntimeAffectedQueryIds: ["list_alerts"],
	});
