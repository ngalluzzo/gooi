import type { DomainRuntimePort } from "@gooi/entrypoint-runtime";
import { normalizeObservedEffects } from "./actions/effects";
import { runActionPlan } from "./actions/run-action-plan";
import type {
	DomainActionPlan,
	DomainCapabilityHandler,
	DomainQueryHandler,
} from "./contracts/action-plan";
import {
	areDomainMutationEnvelopesComparable,
	type DomainMutationEnvelope,
	type DomainQueryEnvelope,
	type DomainRuntimeMode,
	domainRuntimeEnvelopeVersion,
} from "./contracts/envelopes";
import { createDomainRuntimeError } from "./contracts/errors";

type MutationPortInput = Parameters<DomainRuntimePort["executeMutation"]>[0];
type QueryPortInput = Parameters<DomainRuntimePort["executeQuery"]>[0];
type DomainPortResult = Awaited<
	ReturnType<DomainRuntimePort["executeMutation"]>
>;

interface QueryExecutionInput {
	readonly entrypointId: string;
	readonly input: Readonly<Record<string, unknown>>;
	readonly principal: MutationPortInput["principal"];
	readonly ctx: {
		readonly invocationId: string;
		readonly traceId: string;
		readonly now: string;
		readonly mode: DomainRuntimeMode;
	};
}

export interface CreateDomainRuntimeInput {
	readonly mutationEntrypointActionMap: Readonly<Record<string, string>>;
	readonly actions: Readonly<Record<string, DomainActionPlan>>;
	readonly capabilities: Readonly<Record<string, DomainCapabilityHandler>>;
	readonly queries?: Readonly<Record<string, DomainQueryHandler>>;
}

export interface DomainRuntime {
	readonly port: DomainRuntimePort;
	readonly executeMutationEnvelope: (
		input: QueryExecutionInput,
	) => Promise<DomainMutationEnvelope>;
	readonly executeQueryEnvelope: (
		input: QueryExecutionInput,
	) => Promise<DomainQueryEnvelope>;
	readonly areComparable: (
		live: DomainMutationEnvelope,
		simulation: DomainMutationEnvelope,
	) => boolean;
}

const resolveMode = (input: {
	readonly ctx: { readonly mode?: DomainRuntimeMode };
}): DomainRuntimeMode => input.ctx.mode ?? "live";

const mapMutationEnvelopeToDomainResult = (
	envelope: DomainMutationEnvelope,
): DomainPortResult => ({
	ok: envelope.ok,
	...(envelope.output === undefined ? {} : { output: envelope.output }),
	...(envelope.error === undefined ? {} : { error: envelope.error }),
	observedEffects: envelope.observedEffects,
	emittedSignals: envelope.emittedSignals,
});

const mapQueryEnvelopeToDomainResult = (
	envelope: DomainQueryEnvelope,
): DomainPortResult => ({
	ok: envelope.ok,
	...(envelope.output === undefined ? {} : { output: envelope.output }),
	...(envelope.error === undefined ? {} : { error: envelope.error }),
	observedEffects: envelope.observedEffects,
	emittedSignals: [],
});

const buildActionNotFoundEnvelope = (
	execution: QueryExecutionInput,
	message: string,
	details: Readonly<Record<string, unknown>>,
	actionId = "unknown",
): DomainMutationEnvelope => ({
	envelopeVersion: domainRuntimeEnvelopeVersion,
	mode: execution.ctx.mode,
	entrypointId: execution.entrypointId,
	actionId,
	ok: false,
	error: createDomainRuntimeError("action_not_found_error", message, details),
	observedEffects: [],
	emittedSignals: [],
	sessionOutcome: {
		envelopeVersion: domainRuntimeEnvelopeVersion,
		status: "skipped",
		reason: "no_policy",
	},
	trace: {
		mode: execution.ctx.mode,
		entrypointId: execution.entrypointId,
		actionId,
		invocationId: execution.ctx.invocationId,
		traceId: execution.ctx.traceId,
		steps: [],
	},
});

const buildQueryTrace = (execution: QueryExecutionInput) => ({
	mode: execution.ctx.mode,
	entrypointId: execution.entrypointId,
	invocationId: execution.ctx.invocationId,
	traceId: execution.ctx.traceId,
	steps: [],
});

export const createDomainRuntime = (
	input: CreateDomainRuntimeInput,
): DomainRuntime => {
	const executeMutationEnvelope = async (
		execution: QueryExecutionInput,
	): Promise<DomainMutationEnvelope> => {
		const actionId = input.mutationEntrypointActionMap[execution.entrypointId];
		if (actionId === undefined) {
			return buildActionNotFoundEnvelope(
				execution,
				"No action mapping exists for the mutation entrypoint.",
				{ entrypointId: execution.entrypointId },
			);
		}

		const action = input.actions[actionId];
		if (action === undefined) {
			return buildActionNotFoundEnvelope(
				execution,
				"Mapped action was not found in the runtime action plan registry.",
				{ entrypointId: execution.entrypointId, actionId },
				actionId,
			);
		}

		return runActionPlan({
			entrypointId: execution.entrypointId,
			action,
			capabilities: input.capabilities,
			input: execution.input,
			principal: execution.principal,
			ctx: execution.ctx,
		});
	};

	const executeQueryEnvelope = async (
		execution: QueryExecutionInput,
	): Promise<DomainQueryEnvelope> => {
		const handler = input.queries?.[execution.entrypointId];
		const trace = buildQueryTrace(execution);
		if (handler === undefined) {
			return {
				envelopeVersion: domainRuntimeEnvelopeVersion,
				mode: execution.ctx.mode,
				entrypointId: execution.entrypointId,
				ok: false,
				error: createDomainRuntimeError(
					"query_not_found_error",
					"No query handler exists for this entrypoint.",
					{ entrypointId: execution.entrypointId },
				),
				observedEffects: [],
				trace,
			};
		}

		const result = await handler.run(execution);
		const traced = {
			...trace,
			steps: [
				{
					stepId: "query.run",
					phase: "invoke" as const,
					status: result.ok ? ("ok" as const) : ("error" as const),
				},
			],
		};
		if (!result.ok) {
			return {
				envelopeVersion: domainRuntimeEnvelopeVersion,
				mode: execution.ctx.mode,
				entrypointId: execution.entrypointId,
				ok: false,
				error: createDomainRuntimeError(
					"capability_invocation_error",
					"Query handler returned a failed typed result.",
					{ entrypointId: execution.entrypointId, error: result.error },
				),
				observedEffects: normalizeObservedEffects(result.observedEffects),
				trace: traced,
			};
		}

		return {
			envelopeVersion: domainRuntimeEnvelopeVersion,
			mode: execution.ctx.mode,
			entrypointId: execution.entrypointId,
			ok: true,
			output: result.output,
			observedEffects: normalizeObservedEffects(result.observedEffects),
			trace: traced,
		};
	};

	const port: DomainRuntimePort = {
		executeQuery: async (queryInput: QueryPortInput) => {
			const envelope = await executeQueryEnvelope({
				entrypointId: queryInput.entrypoint.id,
				input: queryInput.input,
				principal: queryInput.principal,
				ctx: {
					invocationId: queryInput.ctx.invocationId,
					traceId: queryInput.ctx.traceId,
					now: queryInput.ctx.now,
					mode: resolveMode(queryInput),
				},
			});
			return mapQueryEnvelopeToDomainResult(envelope);
		},
		executeMutation: async (mutationInput: MutationPortInput) => {
			const envelope = await executeMutationEnvelope({
				entrypointId: mutationInput.entrypoint.id,
				input: mutationInput.input,
				principal: mutationInput.principal,
				ctx: {
					invocationId: mutationInput.ctx.invocationId,
					traceId: mutationInput.ctx.traceId,
					now: mutationInput.ctx.now,
					mode: resolveMode(mutationInput),
				},
			});
			return mapMutationEnvelopeToDomainResult(envelope);
		},
	};

	return {
		port,
		executeMutationEnvelope,
		executeQueryEnvelope,
		areComparable: areDomainMutationEnvelopesComparable,
	};
};
