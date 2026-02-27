import { describe, expect, test } from "bun:test";
import { createDomainRuntime } from "../src/engine";

describe("domain-runtime session outcomes and policy ordering", () => {
	test("applies typed success/failure session outcome envelopes deterministically", async () => {
		const runtime = createDomainRuntime({
			mutationEntrypointActionMap: {
				submit_message: "guestbook.submit",
				fail_message: "guestbook.fail",
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
				"guestbook.fail": {
					actionId: "guestbook.fail",
					steps: [
						{
							stepId: "persist",
							capabilityId: "collections.fail",
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
					invoke: async ({ input }) => ({
						ok: true,
						output: { persisted: input },
						observedEffects: ["write"],
					}),
				},
				"collections.fail": {
					capabilityId: "collections.fail",
					contract: {
						requiredKeys: ["message"],
					},
					invoke: async () => ({
						ok: false,
						error: { code: "write_failed" },
						observedEffects: ["write"],
					}),
				},
			},
		});

		const success = await runtime.executeMutationEnvelope({
			entrypointId: "submit_message",
			input: { message: "hello" },
			principal: { subject: "user_1", claims: {}, tags: ["authenticated"] },
			ctx: {
				invocationId: "inv_success",
				traceId: "trace_success",
				now: "2026-02-27T00:00:00.000Z",
				mode: "live",
			},
		});

		const failure = await runtime.executeMutationEnvelope({
			entrypointId: "fail_message",
			input: { message: "hello" },
			principal: { subject: "user_1", claims: {}, tags: ["authenticated"] },
			ctx: {
				invocationId: "inv_failure",
				traceId: "trace_failure",
				now: "2026-02-27T00:00:00.000Z",
				mode: "live",
			},
		});

		expect(success.envelopeVersion).toBe("1.0.0");
		expect(success.ok).toBe(true);
		expect(success.sessionOutcome).toEqual({
			envelopeVersion: "1.0.0",
			status: "cleared",
			reason: "success",
		});

		expect(failure.envelopeVersion).toBe("1.0.0");
		expect(failure.ok).toBe(false);
		expect(failure.error?.code).toBe("capability_invocation_error");
		expect(failure.sessionOutcome).toEqual({
			envelopeVersion: "1.0.0",
			status: "preserved",
			reason: "failure",
		});

		const successSessionTraceIndex = success.trace.steps.findIndex(
			(step) => step.stepId === "session.outcome",
		);
		const failureSessionTraceIndex = failure.trace.steps.findIndex(
			(step) => step.stepId === "session.outcome",
		);
		expect(successSessionTraceIndex).toBeGreaterThan(-1);
		expect(failureSessionTraceIndex).toBeGreaterThan(-1);
	});
});
