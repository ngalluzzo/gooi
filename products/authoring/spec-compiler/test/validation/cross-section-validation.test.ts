import { describe, expect, test } from "bun:test";
import { compileEntrypointBundle } from "../../src/compile/compile-bundle";
import { createComposableEntrypointSpecFixture } from "../fixtures/composable-entrypoint-spec.fixture";

describe("spec-compiler cross-section validation", () => {
	test("fails compilation when duplicate entrypoint ids are declared", () => {
		const fixture = createComposableEntrypointSpecFixture();
		fixture.queries = [
			{
				id: "list_messages",
				access: { roles: ["authenticated"] },
				in: { page: "int", page_size: "int", q: "text" },
				defaults: { page: 1, page_size: 10 },
				returns: { projection: "latest_messages" },
			},
			{
				id: "list_messages",
				access: { roles: ["authenticated"] },
				in: { page: "int", page_size: "int", q: "text" },
				defaults: { page: 1, page_size: 10 },
				returns: { projection: "messages_with_authors" },
			},
		];
		const result = compileEntrypointBundle({
			compilerVersion: "1.0.0",
			spec: fixture,
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.diagnostics.map((item) => item.code)).toContain(
				"duplicate_entrypoint_id",
			);
		}
	});

	test("fails compilation with deterministic ordering for invalid cross-section links", () => {
		const fixture = createComposableEntrypointSpecFixture() as Record<
			string,
			unknown
		>;
		const queries = fixture.queries as Array<Record<string, unknown>>;
		const mutations = fixture.mutations as Array<Record<string, unknown>>;
		const routes = fixture.routes as Array<Record<string, unknown>>;
		const scenarios = fixture.scenarios as Record<
			string,
			Record<string, unknown>
		>;

		const firstQuery = queries[0];
		if (firstQuery !== undefined) {
			firstQuery.returns = { projection: "projection_missing" };
		}
		const firstMutation = mutations[0];
		if (firstMutation !== undefined) {
			firstMutation.run = { actionId: "action_missing", input: {} };
		}
		const firstRoute = routes[0];
		if (firstRoute !== undefined) {
			firstRoute.renders = "screen_missing";
		}
		const firstScenario = scenarios.happy_path_message_submission;
		if (firstScenario !== undefined) {
			firstScenario.context = { persona: "persona_missing" };
		}

		const result = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.diagnostics.every((item) => item.code.length > 0)).toBe(
				true,
			);
			expect(result.diagnostics.map((item) => item.path)).toEqual([
				"mutations.0.run.actionId",
				"queries.0.returns.projection",
				"routes.0.renders",
				"scenarios.happy_path_message_submission.context.persona",
			]);
		}
	});
});
