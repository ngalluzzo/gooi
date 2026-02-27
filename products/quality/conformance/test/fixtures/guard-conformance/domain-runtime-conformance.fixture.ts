import { createDomainRuntime } from "@gooi/domain-runtime";
import type {
	CompiledGuardDefinition,
	CompiledInvariantDefinition,
} from "@gooi/guard-contracts/plans/guard-plan";
import { createProjectionRuntime } from "@gooi/projection-runtime";
import { surfaceEnvelopeVersion } from "@gooi/surface-contracts/envelope-version";
import { createSignalPayloadHash } from "./guard-definitions.fixture";
import { projectionPlan } from "./projection-plan.fixture";

export const evaluateGuardConformanceBoundaryMatrix = async (input: {
	readonly collectionInvariant: CompiledInvariantDefinition;
	readonly actionGuard: CompiledGuardDefinition;
	readonly signalGuard: CompiledGuardDefinition;
	readonly flowGuard: CompiledGuardDefinition;
	readonly projectionGuard: CompiledInvariantDefinition;
}) => {
	const runtime = createDomainRuntime({
		mutationEntrypointActionMap: {
			submit_message: "guestbook.submit",
		},
		actions: {
			"guestbook.submit": {
				actionId: "guestbook.submit",
				guards: {
					pre: input.actionGuard,
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
						invariants: [input.collectionInvariant],
					},
				],
				signalGuards: [
					{
						signalId: "message.rejected",
						definition: input.signalGuard,
					},
				],
				flowGuards: [
					{
						flowId: "rejection_followup",
						definition: input.flowGuard,
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
					const payload = { id: "m1", reason: "" };
					return {
						ok: true,
						output: { id: "m1" },
						observedEffects: ["write", "emit"],
						emittedSignals: [
							{
								envelopeVersion: surfaceEnvelopeVersion,
								signalId: "message.rejected",
								signalVersion: 1,
								payload,
								payloadHash: createSignalPayloadHash(payload),
								emittedAt: ctx.now,
							},
						],
					};
				},
			},
		},
		guards: {
			semanticJudge: {
				evaluate: async () => ({ pass: true }),
			},
		},
	});

	const blockedCollection = await runtime.executeMutationEnvelope({
		entrypointId: "submit_message",
		input: {},
		principal: {
			subject: "user_guard_conformance",
			claims: {},
			tags: ["authenticated"],
		},
		ctx: {
			invocationId: "inv_guard_collection_block",
			traceId: "trace_guard_collection_block",
			now: "2026-02-27T00:00:00.000Z",
			mode: "live",
		},
	});

	const mutation = await runtime.executeMutationEnvelope({
		entrypointId: "submit_message",
		input: { message: "hello" },
		principal: {
			subject: "user_guard_conformance",
			claims: {},
			tags: ["authenticated"],
		},
		ctx: {
			invocationId: "inv_guard_boundaries",
			traceId: "trace_guard_boundaries",
			now: "2026-02-27T00:00:01.000Z",
			mode: "live",
		},
	});

	const projectionRuntime = createProjectionRuntime();
	const projection = await projectionRuntime.executeProjection({
		plan: {
			...projectionPlan,
			guard: input.projectionGuard,
		},
		args: { page: 1, page_size: 10 },
		artifactHash: "guard_conformance_projection_artifact",
		collectionReader: {
			scanCollection: async () => [{ id: "m1" }],
		},
	});

	return {
		collectionInvariantBlocked:
			!blockedCollection.ok &&
			blockedCollection.error?.code === "collection_invariant_error",
		actionGuardPassed:
			mutation.trace.steps.find((step) => step.stepId === "action.pre_guard")
				?.status === "ok",
		signalGuardPassed:
			mutation.trace.steps.find(
				(step) => step.stepId === "signal.message.rejected",
			)?.status === "ok",
		flowGuardPassed:
			mutation.trace.steps.find(
				(step) => step.stepId === "flow.rejection_followup",
			)?.status === "ok",
		projectionGuardPassed:
			projection.ok &&
			(projection.meta?.guards?.violationCount ?? 0) > 0 &&
			(projection.meta?.guards?.violations.length ?? 0) > 0,
	};
};
