import { describe, expect, test } from "bun:test";
import { compileEntrypointBundle } from "../../src/compile/compile-bundle";
import { createComposableEntrypointSpecFixture } from "../fixtures/composable-entrypoint-spec.fixture";

describe("spec-compiler projection IR", () => {
	test("compiles deterministic projection IR for valid projection/query contracts", () => {
		const fixture = createComposableEntrypointSpecFixture();
		const result = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		expect(result.bundle.projectionIR.artifactVersion).toBe("1.0.0");
		expect(result.bundle.projectionIR.queries.list_messages).toEqual(
			expect.objectContaining({
				queryId: "list_messages",
				projectionId: "latest_messages",
				allowsAsOf: false,
			}),
		);
	});

	test("fails compile when projection strategy is missing", () => {
		const fixture = createComposableEntrypointSpecFixture();
		(fixture.domain.projections as Record<string, unknown>).latest_messages =
			{};
		const result = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.diagnostics.map((item) => item.code)).toContain(
				"projection_plan_invalid_error",
			);
			expect(result.diagnostics.map((item) => item.path)).toContain(
				"domain.projections.latest_messages.strategy",
			);
		}
	});

	test("fails compile when as_of is declared for non-timeline projection query", () => {
		const fixture = createComposableEntrypointSpecFixture();
		const query = fixture.queries[0];
		if (query !== undefined) {
			(query.in as Record<string, string>).as_of = "timestamp";
		}
		const result = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.diagnostics.map((item) => item.path)).toContain(
				"queries.0.in.as_of",
			);
			expect(result.diagnostics.map((item) => item.code)).toContain(
				"projection_plan_invalid_error",
			);
		}
	});
});
