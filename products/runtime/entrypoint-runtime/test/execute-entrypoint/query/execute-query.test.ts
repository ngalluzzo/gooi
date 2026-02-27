import { describe, expect, test } from "bun:test";
import { runEntrypoint } from "../../../src/engine";
import {
	createCompiledRuntimeFixture,
	createRuntimeHarness,
} from "../../fixtures/entrypoint-runtime.fixture";

describe("entrypoint-runtime query path", () => {
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
});
