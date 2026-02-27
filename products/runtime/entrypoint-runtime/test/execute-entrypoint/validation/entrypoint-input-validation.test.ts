import { describe, expect, test } from "bun:test";
import { runEntrypoint } from "../../../src/engine";
import {
	createQueryValidationBundle,
	withInvalidSchemaProfile,
} from "./query-validation.fixture";

describe("entrypoint-runtime input validation", () => {
	test("rejects payloads that violate compiled input schema before domain execution", async () => {
		const { bundle, binding } = createQueryValidationBundle();
		let queryCalls = 0;
		const result = await runEntrypoint({
			bundle,
			binding,
			request: { query: { page: true } },
			principal: {
				subject: "user_1",
				claims: {},
				tags: ["authenticated"],
			},
			domainRuntime: {
				executeQuery: async () => {
					queryCalls += 1;
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
		expect(queryCalls).toBe(0);
		if (!result.ok) {
			expect(result.error?.code).toBe("validation_error");
		}
	});

	test("fails with typed diagnostics when compiled schema profile does not match pinned profile", async () => {
		const baseline = createQueryValidationBundle();
		const mismatchBundle = withInvalidSchemaProfile(baseline);
		const result = await runEntrypoint({
			bundle: mismatchBundle.bundle,
			binding: mismatchBundle.binding,
			request: { query: { page: 1 } },
			principal: {
				subject: "user_1",
				claims: {},
				tags: ["authenticated"],
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
			expect(result.error?.code).toBe("validation_error");
			expect(result.error?.details).toEqual(
				expect.objectContaining({
					code: "schema_profile_mismatch",
					expectedSchemaProfile: "draft-2020-12",
					actualSchemaProfile: "draft-7",
				}),
			);
		}
	});
});
