import { describe, expect, test } from "bun:test";
import { runEntrypoint } from "../../../src/engine";
import { createMutationValidationBundle } from "./query-validation.fixture";

describe("entrypoint-runtime mutation configuration", () => {
	test("fails fast when replay TTL is invalid", async () => {
		const { bundle, binding } = createMutationValidationBundle();
		const result = await runEntrypoint({
			bundle,
			binding,
			request: { body: { message: "hello" } },
			principal: {
				subject: "user_1",
				claims: {},
				tags: ["authenticated"],
			},
			replayTtlSeconds: 0,
			domainRuntime: {
				executeQuery: async () => ({
					ok: false,
					error: { message: "not used" },
					observedEffects: [],
				}),
				executeMutation: async () => ({
					ok: true,
					output: { ok: true },
					observedEffects: ["write", "emit"],
					emittedSignals: [],
				}),
			},
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error?.code).toBe("validation_error");
			expect(result.error?.details).toEqual(
				expect.objectContaining({
					code: "replay_ttl_invalid",
					replayTtlSeconds: 0,
				}),
			);
		}
	});
});
