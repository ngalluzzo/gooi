import type { DomainRuntimePort } from "@gooi/entrypoint-runtime";
import {
	areDomainMutationEnvelopesComparable,
	type DomainMutationEnvelope,
	type DomainQueryEnvelope,
	type DomainRuntimeMode,
	domainRuntimeEnvelopeVersion,
} from "../execution-core/envelopes";
import { createDomainRuntimeError } from "../execution-core/errors";
import type {
	DomainActionPlan,
	DomainCapabilityHandler,
	DomainGuardRuntime,
} from "../mutation-path/contracts";
import { runMutationPath } from "../mutation-path/run-mutation-path";
import type { DomainQueryHandler } from "../query-path/contracts";
import {
	type QueryPathExecutionInput,
	runQueryPath,
} from "../query-path/run-query-path";

type MutationPortInput = Parameters<DomainRuntimePort["executeMutation"]>[0];
type QueryPortInput = Parameters<DomainRuntimePort["executeQuery"]>[0];
type DomainPortResult = Awaited<
	ReturnType<DomainRuntimePort["executeMutation"]>
>;

interface RuntimeExecutionInput {
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
	readonly guards?: DomainGuardRuntime;
	readonly queries?: Readonly<Record<string, DomainQueryHandler>>;
}

export interface DomainRuntime {
	readonly port: DomainRuntimePort;
	readonly executeMutationEnvelope: (
		input: RuntimeExecutionInput,
	) => Promise<DomainMutationEnvelope>;
	readonly executeQueryEnvelope: (
		input: RuntimeExecutionInput,
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
	execution: RuntimeExecutionInput,
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

const toQueryExecution = (
	input: RuntimeExecutionInput,
): QueryPathExecutionInput => ({
	entrypointId: input.entrypointId,
	input: input.input,
	principal: input.principal,
	ctx: input.ctx,
});

/**
 * Composes canonical mutation and query execution paths behind DomainRuntimePort.
 */
export const createDomainRuntime = (
	input: CreateDomainRuntimeInput,
): DomainRuntime => {
	const executeMutationEnvelope = async (
		execution: RuntimeExecutionInput,
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

		return runMutationPath({
			entrypointId: execution.entrypointId,
			action,
			capabilities: input.capabilities,
			input: execution.input,
			principal: execution.principal,
			...(input.guards === undefined ? {} : { guardRuntime: input.guards }),
			ctx: execution.ctx,
		});
	};

	const executeQueryEnvelope = async (
		execution: RuntimeExecutionInput,
	): Promise<DomainQueryEnvelope> =>
		runQueryPath({
			execution: toQueryExecution(execution),
			...(input.queries === undefined ? {} : { queries: input.queries }),
		});

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
