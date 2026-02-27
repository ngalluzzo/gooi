import { describe, expect, test } from "bun:test";
import { runEntrypoint } from "../../../src/engine";
import {
	createCompiledRuntimeFixture,
	createRuntimeHarness,
} from "../../fixtures/entrypoint-runtime.fixture";
import { createReplayStore } from "../helpers/replay-store";

describe("entrypoint-runtime mutation path idempotency", () => {
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
