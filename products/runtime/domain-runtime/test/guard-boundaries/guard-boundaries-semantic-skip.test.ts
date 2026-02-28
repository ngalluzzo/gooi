import { describe, expect, test } from "bun:test";
import { createDomainRuntimeConformanceHarness } from "../../src/runtime/create-domain-runtime";
import {
	createDomainRuntimeIRFixture,
	createSessionIRFixture,
} from "../runtime-ir.fixture";
import { createActionGuard } from "./guard-boundaries.fixture";

describe("domain-runtime guard boundaries", () => {
	test("skips semantic action-guard evaluation when structural tier fails", async () => {
		let semanticCalls = 0;
		let invokeCalls = 0;
		const actions = {
			"guestbook.submit": {
				actionId: "guestbook.submit",
				guards: {
					pre: createActionGuard({
						guardId: "action.pre.exists",
						description: "message exists pre-step",
						onFail: "abort",
						path: "domain.actions.guestbook.submit.guards.pre",
						semantic: "message is a real user message",
					}),
				},
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
		} as const;
		const runtime = createDomainRuntimeConformanceHarness({
			domainRuntimeIR: createDomainRuntimeIRFixture({
				mutationEntrypointActionMap: {
					submit_message: "guestbook.submit",
				},
				actions,
			}),
			sessionIR: createSessionIRFixture(),
			capabilities: {
				"collections.write": {
					capabilityId: "collections.write",
					contract: {
						requiredKeys: ["message"],
					},
					invoke: async () => {
						invokeCalls += 1;
						return {
							ok: true,
							output: { id: "m1" },
							observedEffects: ["write"],
						};
					},
				},
			},
			guards: {
				semanticJudge: {
					evaluate: async () => {
						semanticCalls += 1;
						return { pass: true };
					},
				},
			},
		});

		const result = await runtime.executeMutationEnvelope({
			entrypointId: "submit_message",
			input: {},
			principal: { subject: "user_1", claims: {}, tags: ["authenticated"] },
			ctx: {
				invocationId: "inv_guard_boundary_2",
				traceId: "trace_guard_boundary_2",
				now: "2026-02-27T00:00:00.000Z",
				mode: "live",
			},
		});

		expect(result.ok).toBe(false);
		expect(result.error?.code).toBe("action_guard_error");
		expect(result.error?.details?.guardOutcome).toBeDefined();
		expect(semanticCalls).toBe(0);
		expect(invokeCalls).toBe(0);
	});
});
