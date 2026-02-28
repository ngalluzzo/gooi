import { describe, expect, test } from "bun:test";
import type { CompiledGuardDefinition } from "@gooi/guard-contracts/plans";
import type {
	KernelSemanticExecutionInput,
	KernelSemanticRuntimePort,
} from "@gooi/kernel-contracts/semantic-engine";
import { sha256, stableStringify } from "@gooi/stable-json";
import { envelope } from "@gooi/surface-contracts/envelope";
import { executeMutationWithKernelGuards } from "../src/execution/mutation-guards";

const createGuard = (input: {
	readonly primitiveKind: "action" | "signal" | "flow";
	readonly primitiveId: string;
	readonly path: string;
	readonly onFail:
		| "abort"
		| "fail_action"
		| "log_and_continue"
		| "emit_violation";
}): CompiledGuardDefinition => ({
	sourceRef: {
		primitiveKind: input.primitiveKind,
		primitiveId: input.primitiveId,
		path: `guards.${input.primitiveKind}.${input.primitiveId}`,
	},
	onFail: input.onFail,
	structural: [
		{
			guardId: `${input.primitiveId}.exists`,
			description: "field must exist",
			operator: "exists",
			left: { kind: "path", path: input.path },
		},
	],
});

const baseMutationInput: KernelSemanticExecutionInput = {
	entrypoint: {
		id: "submit_message",
		kind: "mutation",
	} as KernelSemanticExecutionInput["entrypoint"],
	kind: "mutation",
	input: { message: "hello" },
	principal: {
		subject: "user_1",
		claims: {},
		tags: ["authenticated"],
	},
	ctx: {
		invocationId: "inv_kernel_guard_1",
		traceId: "trace_kernel_guard_1",
		now: "2026-02-27T00:00:00.000Z",
		mode: "live",
	},
};

describe("kernel mutation guard orchestration", () => {
	test("blocks mutation before core execution when pre guard fails", async () => {
		let coreCalled = false;
		const runtime: KernelSemanticRuntimePort = {
			executeQuery: async () => ({
				ok: true,
				output: {},
				observedEffects: ["read"],
			}),
			executeMutation: async () => {
				throw new Error("legacy executeMutation must not run");
			},
			prepareMutation: async () => ({
				ok: true,
				actionId: "guestbook.submit",
				observedEffects: [],
				preGuard: {
					definition: createGuard({
						primitiveKind: "action",
						primitiveId: "guestbook.submit.pre",
						path: "input.message",
						onFail: "abort",
					}),
					context: { input: {} },
				},
			}),
			executeMutationCore: async () => {
				coreCalled = true;
				return {
					ok: true,
					actionId: "guestbook.submit",
					stepOutputs: {},
					output: {},
					observedEffects: ["write"],
					emittedSignals: [],
				};
			},
		};

		const result = await executeMutationWithKernelGuards({
			domainRuntime: runtime,
			semanticInput: baseMutationInput,
		});
		expect(result.ok).toBe(false);
		expect(coreCalled).toBe(false);
		if (!result.ok) {
			expect(
				(result.error as { readonly code?: string } | undefined)?.code,
			).toBe("action_guard_error");
		}
	});

	test("evaluates post/signal/flow checkpoints and appends violation signals", async () => {
		const signalPayload = { reason: "" };
		const baseSignal = {
			envelopeVersion: envelope.surfaceEnvelopeVersion,
			signalId: "message.rejected",
			signalVersion: 1,
			payload: signalPayload,
			payloadHash: sha256(stableStringify(signalPayload)),
			emittedAt: baseMutationInput.ctx.now,
		} as const;

		const runtime: KernelSemanticRuntimePort = {
			executeQuery: async () => ({
				ok: true,
				output: {},
				observedEffects: ["read"],
			}),
			executeMutation: async () => {
				throw new Error("legacy executeMutation must not run");
			},
			prepareMutation: async () => ({
				ok: true,
				actionId: "guestbook.submit",
				observedEffects: [],
				preGuard: {
					definition: createGuard({
						primitiveKind: "action",
						primitiveId: "guestbook.submit.pre",
						path: "input.message",
						onFail: "abort",
					}),
					context: { input: { message: "hello" } },
				},
			}),
			executeMutationCore: async () => ({
				ok: true,
				actionId: "guestbook.submit",
				stepOutputs: { persist: { id: "m1" } },
				output: { accepted: true },
				observedEffects: ["emit", "write"],
				emittedSignals: [baseSignal],
				postGuard: {
					definition: createGuard({
						primitiveKind: "action",
						primitiveId: "guestbook.submit.post",
						path: "steps.persist.id",
						onFail: "abort",
					}),
					context: {
						steps: { persist: { id: "m1" } },
					},
				},
				signalGuards: [
					{
						signal: baseSignal,
						definition: createGuard({
							primitiveKind: "signal",
							primitiveId: "message.rejected",
							path: "payload.reason_present",
							onFail: "emit_violation",
						}),
						context: {
							payload: {},
						},
					},
				],
				flowGuards: [
					{
						flowId: "notify_ops",
						definition: createGuard({
							primitiveKind: "flow",
							primitiveId: "notify_ops",
							path: "steps.persist.id",
							onFail: "abort",
						}),
						context: {
							steps: { persist: { id: "m1" } },
						},
					},
				],
			}),
		};

		const result = await executeMutationWithKernelGuards({
			domainRuntime: runtime,
			semanticInput: baseMutationInput,
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(
				result.emittedSignals?.some(
					(signal) => signal.signalId === "guard.violated",
				),
			).toBe(true);
			expect(result.observedEffects).toEqual(["emit", "write"]);
		}
	});

	test("falls back to legacy executeMutation when prepare/core APIs are absent", async () => {
		const runtime: KernelSemanticRuntimePort = {
			executeQuery: async () => ({
				ok: true,
				output: {},
				observedEffects: ["read"],
			}),
			executeMutation: async () => ({
				ok: true,
				output: { fallback: true },
				observedEffects: ["write"],
				emittedSignals: [],
			}),
		};

		const result = await executeMutationWithKernelGuards({
			domainRuntime: runtime,
			semanticInput: baseMutationInput,
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.output).toEqual({ fallback: true });
		}
	});
});
