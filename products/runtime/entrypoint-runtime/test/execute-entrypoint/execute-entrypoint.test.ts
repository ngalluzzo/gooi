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
		const savedTtls: number[] = [];
		const store = createHostReplayStorePort({
			load: async (scopeKey) => records.get(scopeKey) ?? null,
			save: async ({ scopeKey, record, ttlSeconds }) => {
				savedTtls.push(ttlSeconds);
				records.set(scopeKey, record);
			},
		});
		return { store, savedTtls };
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
		expect(result.meta.refreshTriggers).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					signalId: "message.created",
					signalVersion: 1,
				}),
			]),
		);
		expect(result.meta.refreshTriggers[0]?.payloadHash).toBe(
			result.emittedSignals[0]?.payloadHash,
		);
		expect(result.emittedSignals.length).toBe(1);
		expect(harness.mutationCalls.count).toBe(1);
	});

	test("deduplicates canonical refresh triggers from duplicate emitted signals", async () => {
		const fixtures = createCompiledRuntimeFixture();
		const duplicateSignal = {
			envelopeVersion: "1.0.0" as const,
			signalId: "message.created",
			signalVersion: 1,
			payloadHash: "duplicate_hash",
			emittedAt: "2026-02-26T00:00:00.000Z",
		};
		const result = await runEntrypoint({
			bundle: fixtures.bundle,
			binding: fixtures.mutationBinding,
			request: { body: { message: "hello" } },
			principal: { subject: "user_1", claims: {}, tags: ["authenticated"] },
			domainRuntime: {
				executeQuery: async () => ({
					ok: true,
					output: { rows: [] },
					observedEffects: ["read"],
				}),
				executeMutation: async () => ({
					ok: true,
					output: { accepted: true },
					observedEffects: ["emit", "write"],
					emittedSignals: [duplicateSignal, duplicateSignal],
				}),
			},
		});

		expect(result.ok).toBe(true);
		expect(result.meta.refreshTriggers).toEqual([
			{
				signalId: "message.created",
				signalVersion: 1,
				payloadHash: "duplicate_hash",
			},
		]);
	});

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

	test("replays mutation result when idempotency key and input hash match", async () => {
		const fixtures = createCompiledRuntimeFixture();
		const harness = createRuntimeHarness();
		const replay = createReplayStore();
		const input = {
			bundle: fixtures.bundle,
			binding: fixtures.mutationBinding,
			request: { body: { message: "hello" } },
			principal: { subject: "user_1", claims: {}, tags: ["authenticated"] },
			domainRuntime: harness.runtime,
			replayStore: replay.store,
			idempotencyKey: "submit-key",
			now: "2026-02-26T00:00:00.000Z",
		};
		const first = await runEntrypoint(input);
		const second = await runEntrypoint(input);

		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		expect(second.meta.replayed).toBe(true);
		expect(harness.mutationCalls.count).toBe(1);
		expect(replay.savedTtls).toEqual([300]);
	});

	test("fails with idempotency conflict when key is reused with different input", async () => {
		const fixtures = createCompiledRuntimeFixture();
		const harness = createRuntimeHarness();
		const replay = createReplayStore();
		const input = {
			bundle: fixtures.bundle,
			binding: fixtures.mutationBinding,
			request: { body: { message: "hello" } },
			principal: { subject: "user_1", claims: {}, tags: ["authenticated"] },
			domainRuntime: harness.runtime,
			replayStore: replay.store,
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

	test("uses explicit replay TTL override when provided", async () => {
		const fixtures = createCompiledRuntimeFixture();
		const harness = createRuntimeHarness();
		const replay = createReplayStore();
		await runEntrypoint({
			bundle: fixtures.bundle,
			binding: fixtures.mutationBinding,
			request: { body: { message: "hello" } },
			principal: { subject: "user_1", claims: {}, tags: ["authenticated"] },
			domainRuntime: harness.runtime,
			replayStore: replay.store,
			replayTtlSeconds: 42,
			idempotencyKey: "submit-key",
			now: "2026-02-26T00:00:00.000Z",
		});

		expect(replay.savedTtls).toEqual([42]);
	});
});
