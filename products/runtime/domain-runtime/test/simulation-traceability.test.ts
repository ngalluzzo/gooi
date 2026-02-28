import { describe, expect, test } from "bun:test";
import { createDomainRuntimeConformanceHarness } from "../src/runtime/create-domain-runtime";
import {
	createDomainRuntimeIRFixture,
	createSessionIRFixture,
} from "./runtime-ir.fixture";

describe("domain-runtime simulation and traceability", () => {
	test("runs deterministic simulation paths without live side effects", async () => {
		let liveInvokeCount = 0;
		let simulateInvokeCount = 0;
		const actions = {
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
						liveInvokeCount += 1;
						return {
							ok: true,
							output: { saved: true },
							observedEffects: ["write", "emit"],
						};
					},
					simulate: async () => {
						simulateInvokeCount += 1;
						return {
							ok: true,
							output: { saved: false },
							observedEffects: ["write", "read", "compute", "session", "emit"],
						};
					},
				},
			},
		});

		const simulation = await runtime.executeMutationEnvelope({
			entrypointId: "submit_message",
			input: { message: "hello" },
			principal: { subject: "user_1", claims: {}, tags: ["authenticated"] },
			ctx: {
				invocationId: "inv_sim",
				traceId: "trace_sim",
				now: "2026-02-27T00:00:00.000Z",
				mode: "simulation",
			},
		});

		expect(simulation.ok).toBe(true);
		expect(liveInvokeCount).toBe(0);
		expect(simulateInvokeCount).toBe(1);
		expect(simulation.observedEffects).toEqual(["compute", "read"]);
	});

	test("includes action and capability step identifiers in runtime traces", async () => {
		const actions = {
			"guestbook.submit": {
				actionId: "guestbook.submit",
				steps: [
					{
						stepId: "moderation",
						capabilityId: "moderation.check",
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
				"moderation.check": {
					capabilityId: "moderation.check",
					contract: {
						requiredKeys: ["message"],
					},
					invoke: async () => ({
						ok: true,
						output: { accepted: true },
						observedEffects: ["compute"],
					}),
				},
			},
		});

		const result = await runtime.executeMutationEnvelope({
			entrypointId: "submit_message",
			input: { message: "hello" },
			principal: { subject: "user_1", claims: {}, tags: ["authenticated"] },
			ctx: {
				invocationId: "inv_trace",
				traceId: "trace_trace",
				now: "2026-02-27T00:00:00.000Z",
				mode: "live",
			},
		});

		expect(result.ok).toBe(true);
		expect(result.trace.actionId).toBe("guestbook.submit");
		expect(
			result.trace.steps.filter((step) => step.stepId === "moderation").length,
		).toBe(3);
		expect(
			result.trace.steps
				.filter((step) => step.stepId === "moderation")
				.map((step) => step.capabilityId),
		).toEqual(["moderation.check", "moderation.check", "moderation.check"]);
	});

	test("compares simulation envelopes against live envelopes by deterministic trace shape", async () => {
		const actions = {
			"guestbook.submit": {
				actionId: "guestbook.submit",
				steps: [
					{
						stepId: "moderation",
						capabilityId: "moderation.check",
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
				"moderation.check": {
					capabilityId: "moderation.check",
					contract: {
						requiredKeys: ["message"],
					},
					invoke: async () => ({
						ok: true,
						output: { accepted: true },
						observedEffects: ["compute"],
					}),
					simulate: async () => ({
						ok: true,
						output: { accepted: true },
						observedEffects: ["compute", "write"],
					}),
				},
			},
		});

		const live = await runtime.executeMutationEnvelope({
			entrypointId: "submit_message",
			input: { message: "hello" },
			principal: { subject: "user_1", claims: {}, tags: ["authenticated"] },
			ctx: {
				invocationId: "inv_live",
				traceId: "trace_live",
				now: "2026-02-27T00:00:00.000Z",
				mode: "live",
			},
		});

		const simulation = await runtime.executeMutationEnvelope({
			entrypointId: "submit_message",
			input: { message: "hello" },
			principal: { subject: "user_1", claims: {}, tags: ["authenticated"] },
			ctx: {
				invocationId: "inv_sim_2",
				traceId: "trace_sim_2",
				now: "2026-02-27T00:00:00.000Z",
				mode: "simulation",
			},
		});

		expect(live.ok).toBe(true);
		expect(simulation.ok).toBe(true);
		expect(runtime.areComparable(live, simulation)).toBe(true);
	});
});
