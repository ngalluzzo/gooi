import { describe, expect, test } from "bun:test";
import { compileEntrypointBundle } from "@gooi/spec-compiler";
import { runEntrypoint } from "../../src/engine";

describe("entrypoint-runtime", () => {
	test("rejects payloads that violate compiled input schema before domain execution", async () => {
		const compiled = compileEntrypointBundle({
			compilerVersion: "1.0.0",
			spec: {
				access: {
					default_policy: "deny",
					roles: { authenticated: {} },
				},
				queries: [
					{
						id: "typed_query",
						access: { roles: ["authenticated"] },
						in: { page: "int!" },
						returns: { projection: "latest_messages" },
					},
				],
				mutations: [],
				wiring: {
					surfaces: {
						http: {
							queries: {
								typed_query: {
									bind: { page: "query.page" },
								},
							},
						},
					},
				},
			},
		});
		expect(compiled.ok).toBe(true);
		if (!compiled.ok) {
			return;
		}

		const binding = compiled.bundle.bindings["http:query:typed_query"];
		expect(binding).toBeDefined();
		if (binding === undefined) {
			return;
		}

		const calls = { query: 0 };
		const result = await runEntrypoint({
			bundle: compiled.bundle,
			binding,
			request: { query: { page: true } },
			principal: {
				subject: "user_1",
				claims: {},
				tags: ["authenticated"],
			},
			domainRuntime: {
				executeQuery: async () => {
					calls.query += 1;
					return {
						ok: true,
						output: { ok: true },
						observedEffects: ["read"],
					};
				},
				executeMutation: async () => ({
					ok: false,
					error: { message: "not used" },
					observedEffects: [],
				}),
			},
		});

		expect(result.ok).toBe(false);
		expect(calls.query).toBe(0);
		if (!result.ok) {
			expect(result.error?.code).toBe("validation_error");
		}
	});
});
