import { describe, expect, test } from "bun:test";
import { compileEntrypointBundle } from "../../src/compile/compile-bundle";
import { createComposableEntrypointSpecFixture } from "../fixtures/composable-entrypoint-spec.fixture";

describe("spec-compiler dispatch web matcher policy", () => {
	test("derives intent matcher for web mutation binding when matcher clauses are absent", () => {
		const fixture = createComposableEntrypointSpecFixture();
		fixture.wiring.surfaces = {
			web: {
				mutations: {
					submit_message: {
						bind: {
							message: "body.message",
						},
					},
				},
			},
		} as unknown as typeof fixture.wiring.surfaces;

		const result = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.bundle.dispatchPlans.plans.web?.handlers).toEqual([
			expect.objectContaining({
				handlerId: "web:mutation:submit_message",
				matcher: {
					surfaceType: "web",
					clauses: [{ key: "intent", op: "eq", value: "submit_message" }],
				},
			}),
		]);
	});

	test("preserves matcher-required behavior for non-web surfaces", () => {
		const fixture = createComposableEntrypointSpecFixture();
		fixture.wiring.surfaces = {
			chat: {
				mutations: {
					submit_message: {
						bind: {
							message: "body.message",
						},
					},
				},
			},
		} as unknown as typeof fixture.wiring.surfaces;

		const result = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(
				result.diagnostics.some(
					(diagnostic) =>
						diagnostic.code === "dispatch_matcher_missing" &&
						diagnostic.path === "wiring.surfaces.chat.mutations.submit_message",
				),
			).toBe(true);
		}
	});
});
