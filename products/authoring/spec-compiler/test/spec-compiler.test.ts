import { describe, expect, test } from "bun:test";
import { compileEntrypointBundle } from "../src/compile/compile-bundle";
import {
	createBindingFieldMismatchFixture,
	createComposableEntrypointSpecFixture,
	createUnsupportedScalarSpecFixture,
} from "./fixtures/composable-entrypoint-spec.fixture";

describe("spec-compiler", () => {
	test("compiles deterministic entrypoint bundle for valid spec fixture", () => {
		const fixture = createComposableEntrypointSpecFixture();
		const first = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});
		const second = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		if (!first.ok || !second.ok) {
			return;
		}

		expect(Object.keys(first.bundle.entrypoints)).toEqual([
			"query:list_messages",
			"mutation:submit_message",
		]);
		expect(Object.keys(first.bundle.bindings)).toEqual([
			"http:query:list_messages",
			"http:mutation:submit_message",
		]);
		const subscription = first.bundle.refreshSubscriptions.list_messages;
		expect(subscription).toBeDefined();
		if (subscription !== undefined) {
			expect(subscription.signalIds).toEqual([
				"message.created",
				"message.deleted",
			]);
		}
		expect(first.bundle.artifactHash).toBe(second.bundle.artifactHash);
		expect(first.bundle.sourceSpecHash).toBe(second.bundle.sourceSpecHash);
	});

	test("fails compilation when unsupported scalar annotation is used", () => {
		const fixture = createUnsupportedScalarSpecFixture();
		const result = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.diagnostics.map((item) => item.code)).toContain(
				"unsupported_scalar_type",
			);
		}
	});

	test("fails compilation when binding references undeclared input field", () => {
		const fixture = createBindingFieldMismatchFixture();
		const result = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.diagnostics.map((item) => item.code)).toContain(
				"binding_field_not_declared",
			);
		}
	});

	test("fails compilation when duplicate entrypoint ids are declared", () => {
		const result = compileEntrypointBundle({
			compilerVersion: "1.0.0",
			spec: {
				access: {
					default_policy: "deny",
					roles: {
						authenticated: {},
					},
				},
				queries: [
					{
						id: "list_messages",
						access: { roles: ["authenticated"] },
						in: { page: "int" },
						returns: { projection: "latest_messages" },
					},
					{
						id: "list_messages",
						access: { roles: ["authenticated"] },
						in: { q: "text" },
						returns: { projection: "messages_with_authors" },
					},
				],
				mutations: [],
				wiring: {
					surfaces: {
						http: {
							queries: {
								list_messages: {
									bind: { q: "query.q" },
								},
							},
						},
					},
				},
			},
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.diagnostics.map((item) => item.code)).toContain(
				"duplicate_entrypoint_id",
			);
		}
	});
});
