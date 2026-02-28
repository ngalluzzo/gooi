import { createDomainRuntimeConformanceHarness } from "@gooi/domain-runtime/conformance";
import type {
	CompiledGuardDefinition,
	CompiledInvariantDefinition,
} from "@gooi/guard-contracts/plans";
import { createProjectionRuntime } from "@gooi/projection-runtime";
import { compileEntrypointBundle } from "@gooi/spec-compiler";
import { envelope } from "@gooi/surface-contracts/envelope";
import { createSignalPayloadHash } from "./guard-definitions.fixture";
import { projectionPlan } from "./projection-plan.fixture";

const compileGuardConformanceRuntimeIR = (input: {
	readonly collectionInvariant: CompiledInvariantDefinition;
	readonly actionGuard: CompiledGuardDefinition;
	readonly signalGuard: CompiledGuardDefinition;
	readonly flowGuard: CompiledGuardDefinition;
}) => {
	const compiled = compileEntrypointBundle({
		spec: {
			app: {
				id: "guard_conformance_app",
				name: "Guard Conformance App",
				tz: "UTC",
			},
			domain: {
				actions: {
					"guestbook.submit": {
						guards: {
							pre: input.actionGuard,
						},
						steps: [
							{
								stepId: "persist",
								capabilityId: "collections.write",
								input: {
									fields: {
										message: {
											$expr: { var: "input.message" },
										},
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
				flows: {
					rejection_followup: {},
				},
			},
			session: {
				fields: {},
			},
			access: {
				default_policy: "deny" as const,
				roles: {
					authenticated: {},
				},
			},
			queries: [],
			mutations: [
				{
					id: "submit_message",
					access: { roles: ["authenticated"] },
					in: {
						message: "text!",
					},
					run: {
						actionId: "guestbook.submit",
						input: {
							message: { $expr: { var: "input.message" } },
						},
					},
				},
			],
			routes: [],
			personas: {},
			scenarios: {},
			wiring: {
				surfaces: {},
			},
			views: {
				nodes: [],
				screens: [],
			},
		},
		compilerVersion: "1.0.0",
	});
	if (!compiled.ok) {
		throw new Error(
			`Guard conformance fixture compile failed: ${compiled.diagnostics.map((item) => item.code).join(",")}`,
		);
	}
	return {
		domainRuntimeIR: compiled.bundle.domainRuntimeIR,
		sessionIR: compiled.bundle.sessionIR,
	};
};

export const evaluateGuardConformanceBoundaryMatrix = async (input: {
	readonly collectionInvariant: CompiledInvariantDefinition;
	readonly actionGuard: CompiledGuardDefinition;
	readonly signalGuard: CompiledGuardDefinition;
	readonly flowGuard: CompiledGuardDefinition;
	readonly projectionGuard: CompiledInvariantDefinition;
}) => {
	const { domainRuntimeIR, sessionIR } = compileGuardConformanceRuntimeIR({
		collectionInvariant: input.collectionInvariant,
		actionGuard: input.actionGuard,
		signalGuard: input.signalGuard,
		flowGuard: input.flowGuard,
	});

	const runtime = createDomainRuntimeConformanceHarness({
		domainRuntimeIR,
		sessionIR,
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
								envelopeVersion: envelope.surfaceEnvelopeVersion,
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
			(projection.guards?.violationCount ?? 0) > 0 &&
			(projection.guards?.violations.length ?? 0) > 0,
	};
};
