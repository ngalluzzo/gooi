import { describe, expect, test } from "bun:test";
import type { CompiledViewRenderIR } from "@gooi/render-contracts/ir";
import type { RefreshTrigger } from "@gooi/surface-contracts/envelope";
import { resolveRenderRefreshLifecycle } from "../src/engine";

const renderIRFixture: CompiledViewRenderIR = {
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
};

describe("surface-runtime render refresh lifecycle", () => {
	test("consumes canonical invalidation signals with deterministic ordering", () => {
		const refreshTriggers: readonly RefreshTrigger[] = [
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
			{
				signalId: "message.created",
				signalVersion: 3,
				payloadHash: "hash_created",
			},
		];

		const first = resolveRenderRefreshLifecycle({
			viewRenderIR: renderIRFixture,
			refreshTriggers,
			affectedQueryIds: ["list_messages", "list_alerts"],
		});
		const second = resolveRenderRefreshLifecycle({
			viewRenderIR: renderIRFixture,
			refreshTriggers,
			affectedQueryIds: ["list_messages", "list_alerts"],
		});

		expect(first).toEqual(second);
		expect(first.ok).toBe(true);
		expect(
			first.plan.refreshTriggers.map((trigger) => trigger.signalId),
		).toEqual(["alert.raised", "message.created", "message.deleted"]);
		expect(
			first.plan.slotRefreshes.map((slot) => `${slot.screenId}:${slot.slotId}`),
		).toEqual(["dashboard:alerts", "dashboard:feed", "home:messages"]);
		expect(first.plan.derivedAffectedQueryIds).toEqual([
			"list_alerts",
			"list_messages",
		]);
		expect(first.diagnostics).toEqual([]);
	});

	test("emits typed diagnostics when runtime and render refresh artifacts diverge", () => {
		const result = resolveRenderRefreshLifecycle({
			viewRenderIR: renderIRFixture,
			refreshTriggers: [
				{
					signalId: "message.created",
					signalVersion: 1,
					payloadHash: "hash_created",
				},
			],
			affectedQueryIds: ["list_alerts"],
		});

		expect(result.ok).toBe(false);
		expect(result.diagnostics.length).toBe(1);
		expect(result.diagnostics[0]?.code).toBe(
			"render_refresh_consistency_error",
		);
		expect(result.diagnostics[0]?.details?.missingInRuntime).toEqual([
			"list_messages",
		]);
		expect(result.diagnostics[0]?.details?.missingInDerived).toEqual([
			"list_alerts",
		]);
	});
});
