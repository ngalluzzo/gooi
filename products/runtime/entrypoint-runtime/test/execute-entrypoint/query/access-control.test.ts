import { describe, expect, test } from "bun:test";
import { compileEntrypointBundle } from "@gooi/spec-compiler";
import { runEntrypoint } from "../../../src/engine";

describe("entrypoint-runtime query access", () => {
	test("does not allow privileged access based on caller-supplied tags alone", async () => {
		const compiled = compileEntrypointBundle({
			compilerVersion: "1.0.0",
			spec: {
				app: {
					id: "execute_entrypoint_fixture_app",
					name: "Execute Entrypoint Fixture App",
					tz: "UTC",
				},
				domain: {
					projections: {
						admin_projection: {},
					},
				},
				session: {
					fields: {},
				},
				access: {
					default_policy: "deny",
					roles: {
						anonymous: {},
						authenticated: {},
						admin: {
							derive: { auth_claim_equals: ["is_admin", true] },
						},
					},
				},
				queries: [
					{
						id: "admin_only_query",
						access: { roles: ["admin"] },
						in: {},
						returns: { projection: "admin_projection" },
					},
				],
				mutations: [],
				routes: [],
				personas: {},
				scenarios: {},
				wiring: {
					surfaces: {
						http: {
							queries: {
								admin_only_query: {
									bind: {},
								},
							},
						},
					},
				},
				views: {
					nodes: [],
					screens: [],
				},
			},
		});
		expect(compiled.ok).toBe(true);
		if (!compiled.ok) {
			return;
		}

		const binding = compiled.bundle.bindings["http:query:admin_only_query"];
		expect(binding).toBeDefined();
		if (binding === undefined) {
			return;
		}

		const result = await runEntrypoint({
			bundle: compiled.bundle,
			binding,
			request: {},
			principal: {
				subject: null,
				claims: {},
				tags: ["admin"],
			},
			domainRuntime: {
				executeQuery: async () => ({
					ok: true,
					output: { ok: true },
					observedEffects: ["read"],
				}),
				executeMutation: async () => ({
					ok: false,
					error: { message: "not used" },
					observedEffects: [],
				}),
			},
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error?.code).toBe("access_denied_error");
		}
	});
});
