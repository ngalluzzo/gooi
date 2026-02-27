import { describe, expect, test } from "bun:test";
import type {
	CompiledGuardDefinition,
	CompiledInvariantDefinition,
} from "@gooi/guard-contracts/plans/guard-plan";
import { sha256, stableStringify } from "@gooi/stable-json";
import { createDomainRuntime } from "../src/runtime/create-domain-runtime";

const createActionGuard = (input: {
	guardId: string;
	description: string;
	onFail: CompiledGuardDefinition["onFail"];
	path: string;
	semantic?: string;
}): CompiledGuardDefinition => ({
	sourceRef: {
		primitiveKind: "action",
		primitiveId: "guestbook.submit",
		path: input.path,
	},
	onFail: input.onFail,
	structural: [
		{
			guardId: input.guardId,
			description: input.description,
			operator: "exists",
			left: { kind: "path", path: "input.message" },
		},
	],
	...(input.semantic === undefined
		? {}
		: {
				semantic: [
					{
						guardId: `${input.guardId}.semantic`,
						description: "semantic message validity",
						rule: input.semantic,
					},
				],
			}),
});

describe("domain-runtime guard boundaries", () => {
	test("enforces collection/action/signal/flow boundaries in deterministic order", async () => {
		let invokeCalls = 0;
		const runtime = createDomainRuntime({
			mutationEntrypointActionMap: {
				submit_message: "guestbook.submit",
			},
			actions: {
				"guestbook.submit": {
					actionId: "guestbook.submit",
					guards: {
						pre: createActionGuard({
							guardId: "action.pre.exists",
							description: "message exists pre-step",
							onFail: "abort",
							path: "domain.actions.guestbook.submit.guards.pre",
						}),
						post: {
							sourceRef: {
								primitiveKind: "action",
								primitiveId: "guestbook.submit",
								path: "domain.actions.guestbook.submit.guards.post",
							},
							onFail: "abort",
							structural: [
								{
									guardId: "action.post.step_output",
									description: "persist output id exists",
									operator: "exists",
									left: { kind: "path", path: "steps.persist.id" },
								},
							],
						},
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
							invariants: [
								{
									sourceRef: {
										primitiveKind: "collection",
										primitiveId: "hello_messages",
										path: "domain.collections.hello_messages.invariants",
									},
									onFail: "abort",
									structural: [
										{
											guardId: "collection.message.exists",
											description: "message exists on write",
											operator: "exists",
											left: { kind: "path", path: "message" },
										},
									],
								} satisfies CompiledInvariantDefinition,
							],
						},
					],
					signalGuards: [
						{
							signalId: "message.rejected",
							definition: {
								sourceRef: {
									primitiveKind: "signal",
									primitiveId: "message.rejected",
									path: "domain.signals.custom.message.rejected.guards",
								},
								onFail: "emit_violation",
								structural: [
									{
										guardId: "signal.reason.exists",
										description: "reason exists",
										operator: "exists",
										left: { kind: "path", path: "payload.reason" },
									},
								],
							},
						},
					],
					flowGuards: [
						{
							flowId: "rejection_followup",
							definition: {
								sourceRef: {
									primitiveKind: "flow",
									primitiveId: "rejection_followup",
									path: "domain.flows.rejection_followup.guards",
								},
								onFail: "log_and_continue",
								structural: [
									{
										guardId: "flow.steps.persist.exists",
										description: "persist step output exists",
										operator: "exists",
										left: { kind: "path", path: "steps.persist.id" },
									},
								],
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
					invoke: async ({ ctx }) => {
						invokeCalls += 1;
						const payload = { id: "m1", message: "rejected input" };
						return {
							ok: true,
							output: { id: "m1" },
							observedEffects: ["write", "emit"],
							emittedSignals: [
								{
									envelopeVersion: "1.0.0",
									signalId: "message.rejected",
									signalVersion: 1,
									payload,
									payloadHash: sha256(stableStringify(payload)),
									emittedAt: ctx.now,
								},
							],
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
				invocationId: "inv_guard_boundary_1",
				traceId: "trace_guard_boundary_1",
				now: "2026-02-27T00:00:00.000Z",
				mode: "live",
			},
		});

		expect(result.ok).toBe(true);
		expect(invokeCalls).toBe(1);
		expect(result.emittedSignals.map((signal) => signal.signalId)).toEqual([
			"message.rejected",
			"guard.violated",
		]);
		const signalGuardTrace = result.trace.steps.find(
			(step) => step.stepId === "signal.message.rejected",
		);
		expect(signalGuardTrace?.detail).toMatchObject({
			boundary: "signal",
			policyApplied: "emit_violation",
			violationCount: 1,
		});
		const signalViolations = signalGuardTrace?.detail?.violations;
		expect(Array.isArray(signalViolations)).toBe(true);
		expect(signalViolations).toHaveLength(1);
		expect(result.trace.steps.map((step) => step.stepId)).toEqual([
			"action.pre_guard",
			"persist",
			"persist",
			"persist",
			"persist",
			"action.post_guard",
			"signal.message.rejected",
			"flow.rejection_followup",
			"session.outcome",
		]);
	});

	test("skips semantic action-guard evaluation when structural tier fails", async () => {
		let semanticCalls = 0;
		let invokeCalls = 0;
		const runtime = createDomainRuntime({
			mutationEntrypointActionMap: {
				submit_message: "guestbook.submit",
			},
			actions: {
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
			},
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
