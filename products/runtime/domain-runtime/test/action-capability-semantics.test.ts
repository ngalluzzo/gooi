import { describe, expect, test } from "bun:test";
import { createDomainRuntime } from "../src/runtime/create-domain-runtime";

describe("domain-runtime action/capability semantics", () => {
	test("applies deterministic defaults and preserves explicit nulls", async () => {
		const calls: Array<Readonly<Record<string, unknown>>> = [];
		const runtime = createDomainRuntime({
			mutationEntrypointActionMap: {
				submit_message: "guestbook.submit",
			},
			actions: {
				"guestbook.submit": {
					actionId: "guestbook.submit",
					steps: [
						{
							stepId: "moderation",
							capabilityId: "moderation.check",
							input: {
								fields: {
									message: { kind: "input", path: "message" },
									channel: { kind: "input", path: "channel" },
								},
								defaults: {
									channel: "direct",
								},
							},
						},
					],
					session: {
						onSuccess: "clear",
						onFailure: "preserve",
					},
				},
			},
			capabilities: {
				"moderation.check": {
					capabilityId: "moderation.check",
					contract: {
						requiredKeys: ["message", "channel"],
						allowedKeys: ["message", "channel"],
					},
					invoke: async ({ input }) => {
						calls.push(input);
						return {
							ok: true,
							output: { accepted: true, input },
							observedEffects: ["compute"],
						};
					},
				},
			},
		});

		const withDefault = await runtime.executeMutationEnvelope({
			entrypointId: "submit_message",
			input: { message: "hello" },
			principal: { subject: "user_1", claims: {}, tags: ["authenticated"] },
			ctx: {
				invocationId: "inv_1",
				traceId: "trace_1",
				now: "2026-02-27T00:00:00.000Z",
				mode: "live",
			},
		});

		const withNull = await runtime.executeMutationEnvelope({
			entrypointId: "submit_message",
			input: { message: "hello", channel: null },
			principal: { subject: "user_1", claims: {}, tags: ["authenticated"] },
			ctx: {
				invocationId: "inv_2",
				traceId: "trace_2",
				now: "2026-02-27T00:00:00.000Z",
				mode: "live",
			},
		});

		expect(withDefault.ok).toBe(true);
		expect(withNull.ok).toBe(true);
		expect(calls[0]).toEqual({
			message: "hello",
			channel: "direct",
		});
		expect(calls[1]).toEqual({
			message: "hello",
			channel: null,
		});
	});

	test("validates capability contract before invocation side effects", async () => {
		let invokeCalls = 0;
		const runtime = createDomainRuntime({
			mutationEntrypointActionMap: {
				submit_message: "guestbook.submit",
			},
			actions: {
				"guestbook.submit": {
					actionId: "guestbook.submit",
					steps: [
						{
							stepId: "moderation",
							capabilityId: "moderation.check",
							input: {
								fields: {
									message: { kind: "input", path: "message" },
									unexpected: { kind: "literal", value: "x" },
								},
							},
						},
					],
					session: {
						onSuccess: "clear",
						onFailure: "preserve",
					},
				},
			},
			capabilities: {
				"moderation.check": {
					capabilityId: "moderation.check",
					contract: {
						requiredKeys: ["message"],
						allowedKeys: ["message"],
					},
					invoke: async () => {
						invokeCalls += 1;
						return {
							ok: true,
							output: { accepted: true },
							observedEffects: ["write"],
						};
					},
				},
			},
		});

		const result = await runtime.executeMutationEnvelope({
			entrypointId: "submit_message",
			input: { message: "hello" },
			principal: { subject: "user_1", claims: {}, tags: ["authenticated"] },
			ctx: {
				invocationId: "inv_3",
				traceId: "trace_3",
				now: "2026-02-27T00:00:00.000Z",
				mode: "live",
			},
		});

		expect(result.ok).toBe(false);
		expect(result.error?.code).toBe("capability_contract_error");
		expect(invokeCalls).toBe(0);
	});

	test("returns stable typed runtime error taxonomy codes", async () => {
		const runtime = createDomainRuntime({
			mutationEntrypointActionMap: {
				submit_message: "guestbook.submit",
			},
			actions: {
				"guestbook.submit": {
					actionId: "guestbook.submit",
					steps: [
						{
							stepId: "persist",
							capabilityId: "collections.write",
							input: {
								fields: {
									message: { kind: "input", path: "message" },
								},
							},
						},
					],
					session: {
						onSuccess: "clear",
						onFailure: "preserve",
					},
				},
			},
			capabilities: {
				"collections.write": {
					capabilityId: "collections.write",
					contract: {
						requiredKeys: ["message"],
					},
					invoke: async () => ({
						ok: false,
						error: { code: "provider_down" },
						observedEffects: [],
					}),
				},
			},
		});

		const result = await runtime.executeMutationEnvelope({
			entrypointId: "submit_message",
			input: { message: "hello" },
			principal: { subject: "user_1", claims: {}, tags: ["authenticated"] },
			ctx: {
				invocationId: "inv_4",
				traceId: "trace_4",
				now: "2026-02-27T00:00:00.000Z",
				mode: "live",
			},
		});

		expect(result.ok).toBe(false);
		expect(result.error?.code).toBe("capability_invocation_error");
	});
});
