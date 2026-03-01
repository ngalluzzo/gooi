import { describe, expect, test } from "bun:test";
import { compileEntrypointBundle } from "../../src/compile/compile-bundle";
import { createComposableEntrypointSpecFixture } from "../fixtures/composable-entrypoint-spec.fixture";

describe("spec-compiler view render IR north-star compatibility", () => {
	test("compiles props/children/root_nodes/query args into deterministic render IR", () => {
		const fixture = createComposableEntrypointSpecFixture();
		fixture.views.nodes = [
			{
				id: "app_shell",
				type: "provider-layouts.shell.app",
				props: { maxWidth: 960, collapsible: false },
				children: ["messages_table"],
			},
			{
				id: "messages_table",
				type: "collections.table",
				props: { emptyText: "No messages yet" },
				children: [],
			},
		] as unknown as typeof fixture.views.nodes;
		fixture.views.screens = [
			{
				id: "home",
				data: {
					messages: {
						query: "list_messages",
						refresh_on_signals: ["message.created", "message.deleted"],
						args: {
							page: { $expr: { var: "session.page" } },
							page_size: 10,
						},
					},
				},
				root_nodes: ["app_shell"],
			},
		] as unknown as typeof fixture.views.screens;

		const result = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		expect(result.bundle.viewRenderIR.nodes.app_shell).toEqual({
			id: "app_shell",
			type: "provider-layouts.shell.app",
			propPlans: {
				collapsible: { value: false },
				maxWidth: { value: 960 },
			},
			children: ["messages_table"],
			interactions: {},
		});
		expect(result.bundle.viewRenderIR.screens.home).toEqual({
			id: "home",
			data: {
				messages: {
					queryId: "list_messages",
					refreshOnSignals: ["message.created", "message.deleted"],
					args: {
						page: { $expr: { var: "session.page" } },
						page_size: 10,
					},
				},
			},
			rootNodeIds: ["app_shell"],
		});
	});
});
