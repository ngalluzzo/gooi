import { describe, expect, test } from "bun:test";
import { createProjectionError } from "../src/errors/projection-errors";
import type { CompiledProjectionPlan } from "../src/plans/projection-plan";

describe("projection contracts", () => {
	test("keeps strategy selection explicit and type-safe", () => {
		const plan: CompiledProjectionPlan = {
			projectionId: "messages_with_authors",
			strategy: "join",
			sourceRef: {
				projectionId: "messages_with_authors",
				path: "domain.projections.messages_with_authors",
				strategy: "join",
			},
			primary: {
				collectionId: "hello_messages",
				alias: "m",
			},
			joins: [
				{
					collectionId: "users",
					alias: "u",
					type: "left",
					on: {
						leftField: "m.user_id",
						rightField: "u.id",
					},
				},
			],
			fields: [
				{ source: "m.id", as: "id" },
				{ source: "u.name", as: "author_name" },
			],
			sort: [{ field: "id", direction: "desc" }],
			pagination: {
				mode: "page",
				pageArg: "page",
				pageSizeArg: "page_size",
				defaultPage: 1,
				defaultPageSize: 10,
				maxPageSize: 50,
			},
		};

		expect(plan.strategy).toBe("join");
		expect(plan.fields.length).toBe(2);
	});

	test("creates typed projection errors with source references", () => {
		const error = createProjectionError(
			"projection_plan_error",
			"Invalid join configuration.",
			{
				projectionId: "messages_with_authors",
				path: "domain.projections.messages_with_authors.join.0",
				strategy: "join",
			},
			{ missingField: "on.leftField" },
		);

		expect(error.code).toBe("projection_plan_error");
		expect(error.sourceRef.path).toContain("join.0");
		expect(error.details).toEqual({ missingField: "on.leftField" });
	});

	test("expresses timeline signal replay migration policy contracts", () => {
		const plan: CompiledProjectionPlan = {
			projectionId: "user_message_state_timeline",
			strategy: "timeline",
			sourceRef: {
				projectionId: "user_message_state_timeline",
				path: "domain.projections.user_message_state_timeline",
				strategy: "timeline",
			},
			signals: ["message.created"],
			groupByField: "payload.user_id",
			orderBy: { field: "emittedAt", direction: "asc" },
			start: { message_count: 0 },
			reducers: {
				"message.created": [{ op: "inc", field: "message_count", value: 1 }],
			},
			signalReplay: {
				"message.created": {
					currentVersion: 3,
					oldestRetainedVersion: 1,
					steps: [
						{
							fromVersion: 1,
							toVersion: 2,
							operations: [{ op: "rename", from: "message", to: "text" }],
						},
						{
							fromVersion: 2,
							toVersion: 3,
							operations: [{ op: "coerce", field: "priority", to: "number" }],
						},
					],
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
				window: { defaultLimit: 100, maxLimit: 100 },
				rebuild: { mode: "full" },
			},
		};

		expect(plan.strategy).toBe("timeline");
		expect(plan.signalReplay["message.created"]?.steps.length).toBe(2);
	});
});
