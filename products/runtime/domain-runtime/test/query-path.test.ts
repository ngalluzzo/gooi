import { describe, expect, test } from "bun:test";
import { createDomainRuntimeConformanceHarness } from "../src/runtime/create-domain-runtime";
import {
	createDomainRuntimeIRFixture,
	createSessionIRFixture,
} from "./runtime-ir.fixture";

describe("domain-runtime query path", () => {
	test("returns typed query-not-found failure envelope", async () => {
		const runtime = createDomainRuntimeConformanceHarness({
			domainRuntimeIR: createDomainRuntimeIRFixture({
				mutationEntrypointActionMap: {},
				actions: {},
			}),
			sessionIR: createSessionIRFixture(),
			capabilities: {},
		});

		const result = await runtime.executeQueryEnvelope({
			entrypointId: "messages.list",
			input: {},
			principal: { subject: "user_1", claims: {}, tags: ["authenticated"] },
			ctx: {
				invocationId: "inv_query_1",
				traceId: "trace_query_1",
				now: "2026-02-27T00:00:00.000Z",
				mode: "live",
			},
		});

		expect(result.ok).toBe(false);
		expect(result.error?.code).toBe("query_not_found_error");
		expect(result.trace.steps).toEqual([]);
	});

	test("uses canonical failure envelope for typed query invocation failures", async () => {
		const runtime = createDomainRuntimeConformanceHarness({
			domainRuntimeIR: createDomainRuntimeIRFixture({
				mutationEntrypointActionMap: {},
				actions: {},
				queries: ["messages.list"],
			}),
			sessionIR: createSessionIRFixture(),
			capabilities: {},
			queryHandlers: {
				"messages.list": {
					run: async () => ({
						ok: false,
						error: { code: "provider_error" },
						observedEffects: ["read"],
					}),
				},
			},
		});

		const result = await runtime.executeQueryEnvelope({
			entrypointId: "messages.list",
			input: {},
			principal: { subject: "user_1", claims: {}, tags: ["authenticated"] },
			ctx: {
				invocationId: "inv_query_2",
				traceId: "trace_query_2",
				now: "2026-02-27T00:00:00.000Z",
				mode: "live",
			},
		});

		expect(result.ok).toBe(false);
		expect(result.error?.code).toBe("capability_invocation_error");
		expect(result.observedEffects).toEqual(["read"]);
		expect(result.trace.steps[0]?.stepId).toBe("query.run");
	});
});
