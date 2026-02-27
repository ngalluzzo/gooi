import { createDomainRuntime } from "@gooi/domain-runtime";
import type {
	CompiledGuardDefinition,
	CompiledInvariantDefinition,
} from "@gooi/guard-contracts/plans/guard-plan";
import { evaluateGuard, evaluateInvariant } from "@gooi/guard-runtime/evaluate";
import type { CompiledFromCollectionProjectionPlan } from "@gooi/projection-contracts/plans/projection-plan";
import { createProjectionRuntime } from "@gooi/projection-runtime";
import { sha256, stableStringify } from "@gooi/stable-json";
import { surfaceEnvelopeVersion } from "@gooi/surface-contracts/envelope-version";

const collectionInvariant: CompiledInvariantDefinition = {
	sourceRef: {
		primitiveKind: "collection",
		primitiveId: "hello_messages",
		path: "domain.collections.hello_messages.invariants",
	},
	onFail: "abort",
	structural: [
		{
			guardId: "message_exists",
			description: "message exists",
			operator: "exists",
			left: { kind: "path", path: "message" },
		},
	],
};

const actionGuard: CompiledGuardDefinition = {
	sourceRef: {
		primitiveKind: "action",
		primitiveId: "guestbook.submit",
		path: "domain.actions.guestbook.submit.guards",
	},
	onFail: "abort",
	structural: [
		{
			guardId: "message_non_empty",
			description: "message must not be empty",
			operator: "neq",
			left: { kind: "path", path: "input.message" },
			right: { kind: "literal", value: "" },
		},
	],
	semantic: [
		{
			guardId: "message_quality",
			description: "message quality",
			rule: "Message should read naturally.",
			confidence: "high",
			sampling: { production: 1, simulation: 1, ci: 1 },
		},
	],
};

const signalGuard: CompiledGuardDefinition = {
	sourceRef: {
		primitiveKind: "signal",
		primitiveId: "message.rejected",
		path: "domain.signals.custom.message.rejected.guards",
	},
	onFail: "emit_violation",
	structural: [
		{
			guardId: "reason_present",
			description: "reason must be present",
			operator: "neq",
			left: { kind: "path", path: "payload.reason" },
			right: { kind: "literal", value: "" },
		},
	],
	semantic: [],
};

const flowGuard: CompiledGuardDefinition = {
	sourceRef: {
		primitiveKind: "flow",
		primitiveId: "rejection_followup",
		path: "domain.flows.rejection_followup.guards",
	},
	onFail: "log_and_continue",
	structural: [
		{
			guardId: "log_step_ok",
			description: "log step should pass",
			operator: "eq",
			left: { kind: "path", path: "steps.notify.ok" },
			right: { kind: "literal", value: true },
		},
	],
	semantic: [],
};

const projectionGuard: CompiledInvariantDefinition = {
	sourceRef: {
		primitiveKind: "projection",
		primitiveId: "messages_with_authors",
		path: "domain.projections.messages_with_authors.guards",
	},
	onFail: "log_and_continue",
	structural: [
		{
			guardId: "user_id_present",
			description: "user_id should be present",
			operator: "exists",
			left: { kind: "path", path: "row.user_id" },
		},
	],
};

const projectionPlan: CompiledFromCollectionProjectionPlan = {
	projectionId: "messages_with_authors",
	strategy: "from_collection",
	sourceRef: {
		projectionId: "messages_with_authors",
		path: "domain.projections.messages_with_authors",
		strategy: "from_collection",
	},
	collectionId: "hello_messages",
	fields: [{ source: "id", as: "id" }],
	sort: [{ field: "id", direction: "asc" }],
	pagination: {
		mode: "page",
		pageArg: "page",
		pageSizeArg: "page_size",
		defaultPage: 1,
		defaultPageSize: 10,
		maxPageSize: 50,
	},
	guard: projectionGuard,
};

const createSignalPayloadHash = (payload: Readonly<Record<string, unknown>>) =>
	sha256(stableStringify(payload));

export const createGuardConformanceFixture = () => ({
	collectionInvariant,
	actionGuard,
	signalGuard,
	flowGuard,
	projectionGuard,
	evaluateInvariant,
	evaluateGuard,
	evaluateBoundaryMatrix: async (input: {
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
	},
});
