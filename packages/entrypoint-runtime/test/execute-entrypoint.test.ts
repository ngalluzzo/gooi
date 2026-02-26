import { describe, expect, test } from "bun:test";
import { compileEntrypointBundle } from "@gooi/spec-compiler";
import { executeEntrypoint } from "../src/execute-entrypoint";
import { createInMemoryIdempotencyStore } from "../src/idempotency-store";
import {
	createCompiledRuntimeFixture,
	createRuntimeHarness,
} from "./fixtures/entrypoint-runtime.fixture";

describe("entrypoint-runtime", () => {
	test("executes query with binding defaults and typed success envelope", async () => {
		const fixtures = createCompiledRuntimeFixture();
		const harness = createRuntimeHarness();
		const result = await executeEntrypoint({
			bundle: fixtures.bundle,
			binding: fixtures.queryBinding,
			request: { query: { page: "2" } },
			principal: { subject: "user_1", claims: {}, tags: ["authenticated"] },
			domainRuntime: harness.runtime,
			traceId: "trace_query",
			invocationId: "inv_query",
			now: "2026-02-26T00:00:00.000Z",
		});

		expect(result.ok).toBe(true);
		expect(result.traceId).toBe("trace_query");
		expect(result.meta.replayed).toBe(false);
		expect(harness.queryCalls.count).toBe(1);
		if (result.ok) {
			expect(result.output).toEqual({
				rows: [{ input: { page: 2, page_size: 10 } }],
			});
		}
	});

	test("rejects access when principal roles do not satisfy access plan", async () => {
		const fixtures = createCompiledRuntimeFixture();
		const harness = createRuntimeHarness();
		const result = await executeEntrypoint({
			bundle: fixtures.bundle,
			binding: fixtures.queryBinding,
			request: { query: {} },
			principal: { subject: null, claims: {}, tags: [] },
			domainRuntime: harness.runtime,
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error?.code).toBe("access_denied_error");
		}
	});

	test("executes mutation and returns affected query ids from refresh subscriptions", async () => {
		const fixtures = createCompiledRuntimeFixture();
		const harness = createRuntimeHarness();
		const result = await executeEntrypoint({
			bundle: fixtures.bundle,
			binding: fixtures.mutationBinding,
			request: { body: { message: "hello" } },
			principal: { subject: "user_1", claims: {}, tags: ["authenticated"] },
			domainRuntime: harness.runtime,
			now: "2026-02-26T00:00:00.000Z",
		});

		expect(result.ok).toBe(true);
		expect(result.meta.affectedQueryIds).toEqual(["list_messages"]);
		expect(result.emittedSignals.length).toBe(1);
		expect(harness.mutationCalls.count).toBe(1);
	});

	test("replays mutation result when idempotency key and input hash match", async () => {
		const fixtures = createCompiledRuntimeFixture();
		const harness = createRuntimeHarness();
		const store = createInMemoryIdempotencyStore();
		const input = {
			bundle: fixtures.bundle,
			binding: fixtures.mutationBinding,
			request: { body: { message: "hello" } },
			principal: { subject: "user_1", claims: {}, tags: ["authenticated"] },
			domainRuntime: harness.runtime,
			idempotencyStore: store,
			idempotencyKey: "submit-key",
			now: "2026-02-26T00:00:00.000Z",
		};
		const first = await executeEntrypoint(input);
		const second = await executeEntrypoint(input);

		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		expect(second.meta.replayed).toBe(true);
		expect(harness.mutationCalls.count).toBe(1);
	});

	test("fails with idempotency conflict when key is reused with different input", async () => {
		const fixtures = createCompiledRuntimeFixture();
		const harness = createRuntimeHarness();
		const store = createInMemoryIdempotencyStore();
		await executeEntrypoint({
			bundle: fixtures.bundle,
			binding: fixtures.mutationBinding,
			request: { body: { message: "hello" } },
			principal: { subject: "user_1", claims: {}, tags: ["authenticated"] },
			domainRuntime: harness.runtime,
			idempotencyStore: store,
			idempotencyKey: "submit-key",
			now: "2026-02-26T00:00:00.000Z",
		});
		const conflict = await executeEntrypoint({
			bundle: fixtures.bundle,
			binding: fixtures.mutationBinding,
			request: { body: { message: "different" } },
			principal: { subject: "user_1", claims: {}, tags: ["authenticated"] },
			domainRuntime: harness.runtime,
			idempotencyStore: store,
			idempotencyKey: "submit-key",
			now: "2026-02-26T00:00:00.000Z",
		});

		expect(conflict.ok).toBe(false);
		if (!conflict.ok) {
			expect(conflict.error?.code).toBe("idempotency_conflict_error");
		}
	});

	test("does not allow privileged access based on caller-supplied tags alone", async () => {
		const compiled = compileEntrypointBundle({
			compilerVersion: "1.0.0",
			spec: {
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

		const result = await executeEntrypoint({
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
		const result = await executeEntrypoint({
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
