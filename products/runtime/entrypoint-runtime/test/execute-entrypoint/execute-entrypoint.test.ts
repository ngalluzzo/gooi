import { describe, expect, test } from "bun:test";
import {
	createHostReplayStorePort,
	type HostReplayRecord,
} from "@gooi/host-contracts/replay";
import { compileEntrypointBundle } from "@gooi/spec-compiler";
import { runEntrypoint } from "../../src/engine";
import {
	createCompiledRuntimeFixture,
	createRuntimeHarness,
} from "../fixtures/entrypoint-runtime.fixture";

describe("entrypoint-runtime", () => {
	const createReplayStore = () => {
		const records = new Map<
			string,
			HostReplayRecord<Awaited<ReturnType<typeof runEntrypoint>>>
		>();
		return createHostReplayStorePort({
			load: async (scopeKey) => records.get(scopeKey) ?? null,
			save: async ({ scopeKey, record }) => {
				records.set(scopeKey, record);
			},
		});
	};

	test("executes query with binding defaults and typed success envelope", async () => {
		const fixtures = createCompiledRuntimeFixture();
		const harness = createRuntimeHarness();
		const result = await runEntrypoint({
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
		const result = await runEntrypoint({
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
		const result = await runEntrypoint({
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

	test("replays mutation result when idempotency key and input hash match", async () => {
		const fixtures = createCompiledRuntimeFixture();
		const harness = createRuntimeHarness();
		const store = createReplayStore();
		const input = {
			bundle: fixtures.bundle,
			binding: fixtures.mutationBinding,
			request: { body: { message: "hello" } },
			principal: { subject: "user_1", claims: {}, tags: ["authenticated"] },
			domainRuntime: harness.runtime,
			replayStore: store,
			idempotencyKey: "submit-key",
			now: "2026-02-26T00:00:00.000Z",
		};
		const first = await runEntrypoint(input);
		const second = await runEntrypoint(input);

		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		expect(second.meta.replayed).toBe(true);
		expect(harness.mutationCalls.count).toBe(1);
	});

	test("fails with idempotency conflict when key is reused with different input", async () => {
		const fixtures = createCompiledRuntimeFixture();
		const harness = createRuntimeHarness();
		const store = createReplayStore();
		const input = {
			bundle: fixtures.bundle,
			binding: fixtures.mutationBinding,
			request: { body: { message: "hello" } },
			principal: { subject: "user_1", claims: {}, tags: ["authenticated"] },
			domainRuntime: harness.runtime,
			replayStore: store,
			idempotencyKey: "submit-key",
			now: "2026-02-26T00:00:00.000Z",
		};

		await runEntrypoint(input);
		const conflict = await runEntrypoint({
			...input,
			request: { body: { message: "different" } },
		});

		expect(conflict.ok).toBe(false);
		if (!conflict.ok) {
			expect(conflict.error?.code).toBe("idempotency_conflict_error");
		}
	});
});
