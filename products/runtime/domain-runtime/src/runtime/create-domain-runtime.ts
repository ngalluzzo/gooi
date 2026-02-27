import type {
	KernelSemanticExecutionInput,
	KernelSemanticExecutionResult,
	KernelSemanticRuntimePort,
} from "@gooi/kernel-contracts/semantic-engine";
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

type SemanticInput = KernelSemanticExecutionInput;
type DomainSemanticResult = KernelSemanticExecutionResult;

interface RuntimeExecutionInput {
	readonly entrypointId: string;
	readonly input: Readonly<Record<string, unknown>>;
	readonly principal: SemanticInput["principal"];
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

export interface DomainRuntimeConformanceHarness {
	readonly semanticRuntime: KernelSemanticRuntimePort;
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

const toRuntimeExecutionInput = (
	input: SemanticInput,
): RuntimeExecutionInput => ({
	entrypointId: input.entrypoint.id,
	input: input.input,
	principal: input.principal,
	ctx: {
		invocationId: input.ctx.invocationId,
		traceId: input.ctx.traceId,
		now: input.ctx.now,
		mode: resolveMode(input),
	},
});

const mapMutationEnvelopeToDomainResult = (
	envelope: DomainMutationEnvelope,
): DomainSemanticResult => ({
	ok: envelope.ok,
	...(envelope.output === undefined ? {} : { output: envelope.output }),
	...(envelope.error === undefined ? {} : { error: envelope.error }),
	observedEffects: envelope.observedEffects,
	emittedSignals: envelope.emittedSignals,
});

const mapQueryEnvelopeToDomainResult = (
	envelope: DomainQueryEnvelope,
): DomainSemanticResult => ({
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
 * Creates the domain semantic engine with envelope-level diagnostics hooks.
 */
export const createDomainRuntimeConformanceHarness = (
	input: CreateDomainRuntimeInput,
): DomainRuntimeConformanceHarness => {
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

	const semanticRuntime: KernelSemanticRuntimePort = {
		executeQuery: async (queryInput) => {
			const envelope = await executeQueryEnvelope(
				toRuntimeExecutionInput(queryInput),
			);
			return mapQueryEnvelopeToDomainResult(envelope);
		},
		executeMutation: async (mutationInput) => {
			const envelope = await executeMutationEnvelope(
				toRuntimeExecutionInput(mutationInput),
			);
			return mapMutationEnvelopeToDomainResult(envelope);
		},
	};

	return {
		semanticRuntime,
		executeMutationEnvelope,
		executeQueryEnvelope,
		areComparable: areDomainMutationEnvelopesComparable,
	};
};

export type DomainRuntime = KernelSemanticRuntimePort;

/**
 * Creates the minimal domain semantic runtime consumed by kernel.
 */
export const createDomainRuntime = (
	input: CreateDomainRuntimeInput,
): DomainRuntime =>
	createDomainRuntimeConformanceHarness(input).semanticRuntime;
