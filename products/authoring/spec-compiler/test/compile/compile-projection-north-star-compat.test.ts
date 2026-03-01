import { describe, expect, test } from "bun:test";
import { compileEntrypointBundle } from "../../src/compile/compile-bundle";
import { createComposableEntrypointSpecFixture } from "../fixtures/composable-entrypoint-spec.fixture";

describe("spec-compiler projection north-star compatibility", () => {
	test("compiles north-star projection shapes into canonical projection IR", () => {
		const fixture = createComposableEntrypointSpecFixture();
		fixture.domain.collections = {
			hello_messages: {
				fields: {
					id: "id!",
					message: "text!",
					created_at: "timestamp!",
					user_id: "id!",
				},
			},
			users: {
				fields: {
					id: "id!",
					name: "text!",
				},
			},
		};
		(fixture.domain.projections as Record<string, unknown>) = {
			latest_messages: {
				strategy: "from_collection",
				collection: "hello_messages",
				sort: {
					default_by: "created_at",
					default_order: "desc",
				},
				pagination: {
					mode: "page",
					page_arg: "page",
					page_size_arg: "page_size",
					default_page_size: 10,
					max_page_size: 50,
				},
			},
			messages_with_authors: {
				strategy: "join",
				primary: {
					collection: "hello_messages",
					as: "m",
				},
				join: [
					{
						collection: "users",
						as: "u",
						type: "left",
						on: {
							"==": [{ var: "m.user_id" }, { var: "u.id" }],
						},
					},
				],
				fields: ["m.id", "m.message", "u.name as author_name"],
				sort: {
					default_by: "m.created_at",
					default_order: "desc",
				},
				pagination: {
					mode: "page",
					page_arg: "page",
					page_size_arg: "page_size",
					default_page_size: 10,
					max_page_size: 50,
				},
			},
			user_activity: {
				strategy: "aggregate",
				primary: {
					collection: "hello_messages",
					as: "m",
				},
				join: [
					{
						collection: "users",
						as: "u",
						type: "left",
						on: {
							"==": [{ var: "m.user_id" }, { var: "u.id" }],
						},
					},
				],
				group_by: ["m.user_id", "u.name"],
				metrics: [
					{ id: "message_count", op: "count" },
					{ id: "last_posted_at", op: "max", field: "m.created_at" },
				],
				sort: {
					default_by: "message_count",
					default_order: "desc",
				},
				pagination: {
					mode: "page",
					page_arg: "page",
					page_size_arg: "page_size",
					default_page_size: 20,
					max_page_size: 100,
				},
			},
			user_message_state_timeline: {
				strategy: "timeline",
				signals: ["message.created"],
				group_by: ["payload.user_id"],
				order_by: {
					field: "emitted_at",
					direction: "asc",
				},
				start: {
					message_count: 0,
				},
				when: {
					"message.created": {
						message_count: {
							$expr: {
								"+": [{ var: "acc.message_count" }, 1],
							},
						},
						last_message: {
							$expr: {
								var: "payload.message",
							},
						},
					},
				},
				pagination: {
					mode: "page",
					page_arg: "page",
					page_size_arg: "page_size",
					default_page_size: 20,
					max_page_size: 100,
				},
			},
		};
		const result = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		expect(
			result.bundle.projectionIR.projections.latest_messages,
		).toMatchObject({
			strategy: "from_collection",
			collectionId: "hello_messages",
			pagination: {
				defaultPage: 1,
				defaultPageSize: 10,
			},
		});
		const latestMessages =
			result.bundle.projectionIR.projections.latest_messages;
		expect(latestMessages).toBeDefined();
		if (latestMessages !== undefined) {
			expect(latestMessages.strategy).toBe("from_collection");
			if (latestMessages.strategy === "from_collection") {
				expect(latestMessages.fields.map((field) => field.as)).toEqual([
					"created_at",
					"id",
					"message",
					"user_id",
				]);
			}
		}
		expect(
			result.bundle.projectionIR.projections.messages_with_authors,
		).toMatchObject({
			strategy: "join",
			primary: {
				collectionId: "hello_messages",
				alias: "m",
			},
		});
		expect(result.bundle.projectionIR.projections.user_activity).toMatchObject({
			strategy: "aggregate",
			groupBy: [
				{ field: "m.user_id", as: "user_id" },
				{ field: "u.name", as: "name" },
			],
			metrics: [
				{ metricId: "message_count", op: "count" },
				{ metricId: "last_posted_at", op: "max", field: "m.created_at" },
			],
		});
		expect(
			result.bundle.projectionIR.projections.user_message_state_timeline,
		).toMatchObject({
			strategy: "timeline",
			groupByField: "payload.user_id",
		});
		const timelineProjection =
			result.bundle.projectionIR.projections.user_message_state_timeline;
		expect(timelineProjection).toBeDefined();
		if (timelineProjection !== undefined) {
			expect(timelineProjection.strategy).toBe("timeline");
			if (timelineProjection.strategy === "timeline") {
				expect(timelineProjection.reducers["message.created"]).toContainEqual({
					op: "inc",
					field: "message_count",
					value: 1,
				});
			}
		}
	});
});
