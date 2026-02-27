import { describe, expect, test } from "bun:test";
import { runEntrypoint } from "../../../src/engine";
import {
	createCompiledRuntimeFixture,
	createRuntimeHarness,
} from "../../fixtures/entrypoint-runtime.fixture";

describe("entrypoint-runtime mutation path refresh", () => {
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
});
