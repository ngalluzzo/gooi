import type {
	CompiledDomainMutationPlan,
	CompiledDomainRuntimeIR,
	CompiledSessionIR,
} from "@gooi/app-spec-contracts/compiled";
import type {
	KernelSemanticExecutionInput,
	KernelSemanticExecutionResult,
	KernelSemanticMutationCoreResult,
	KernelSemanticMutationPreparationResult,
} from "@gooi/kernel-contracts/semantic-engine";
import {
	type DomainMutationEnvelope,
	type DomainQueryEnvelope,
	type DomainRuntimeMode,
	domainRuntimeEnvelopeVersion,
} from "../execution-core/envelopes";
import { createDomainRuntimeError } from "../execution-core/errors";
import type {
	DomainCapabilityHandler,
	DomainGuardRuntime,
} from "../mutation-path/contracts";
import type { RunMutationPathInput } from "../mutation-path/run-mutation-state";
import type { DomainQueryHandler } from "../query-path/contracts";
import type { QueryPathExecutionInput } from "../query-path/run-query-path";
import { applyMutationInputBindings } from "./runtime-input-bindings";

export type SemanticInput = KernelSemanticExecutionInput;
export type DomainSemanticResult = KernelSemanticExecutionResult;

export interface RuntimeExecutionInput {
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
	readonly domainRuntimeIR: CompiledDomainRuntimeIR;
	readonly sessionIR: CompiledSessionIR;
	readonly capabilities: Readonly<Record<string, DomainCapabilityHandler>>;
	readonly guards?: DomainGuardRuntime;
	readonly queryHandlers?: Readonly<Record<string, DomainQueryHandler>>;
}

export interface DomainRuntimeConformanceHarness {
	readonly semanticRuntime: import("@gooi/kernel-contracts/semantic-engine").KernelSemanticRuntimePort;
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

export const assertSessionIRContracts = (
	sessionIR: CompiledSessionIR,
): void => {
	for (const fieldId of Object.keys(sessionIR.defaults)) {
		if (sessionIR.fields[fieldId] !== undefined) {
			continue;
		}
		throw new Error(
			`Session IR default references undeclared field: ${fieldId}`,
		);
	}
};

export const toRuntimeExecutionInput = (
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

export const mapMutationEnvelopeToDomainResult = (
	envelope: DomainMutationEnvelope,
): DomainSemanticResult => ({
	ok: envelope.ok,
	...(envelope.output === undefined ? {} : { output: envelope.output }),
	...(envelope.error === undefined ? {} : { error: envelope.error }),
	observedEffects: envelope.observedEffects,
	emittedSignals: envelope.emittedSignals,
});

export const mapQueryEnvelopeToDomainResult = (
	envelope: DomainQueryEnvelope,
): DomainSemanticResult => ({
	ok: envelope.ok,
	...(envelope.output === undefined ? {} : { output: envelope.output }),
	...(envelope.error === undefined ? {} : { error: envelope.error }),
	observedEffects: envelope.observedEffects,
	emittedSignals: [],
});

export const buildActionNotFoundEnvelope = (
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

export const buildQueryNotFoundEnvelope = (
	execution: RuntimeExecutionInput,
): DomainQueryEnvelope => ({
	envelopeVersion: domainRuntimeEnvelopeVersion,
	mode: execution.ctx.mode,
	entrypointId: execution.entrypointId,
	ok: false,
	error: createDomainRuntimeError(
		"query_not_found_error",
		"No compiled query runtime plan exists for this entrypoint.",
		{ entrypointId: execution.entrypointId },
	),
	observedEffects: [],
	trace: {
		mode: execution.ctx.mode,
		entrypointId: execution.entrypointId,
		invocationId: execution.ctx.invocationId,
		traceId: execution.ctx.traceId,
		steps: [],
	},
});

export const resolveCompiledQueryPlan = (input: {
	readonly domainRuntimeIR: CompiledDomainRuntimeIR;
	readonly execution: RuntimeExecutionInput;
}): CompiledDomainRuntimeIR["queries"][string] | undefined =>
	input.domainRuntimeIR.queries[input.execution.entrypointId];

export const toQueryExecution = (
	input: RuntimeExecutionInput,
): QueryPathExecutionInput => ({
	entrypointId: input.entrypointId,
	input: input.input,
	principal: input.principal,
	ctx: input.ctx,
});

export const toRunMutationInput = (
	execution: RuntimeExecutionInput,
	action: CompiledDomainRuntimeIR["actions"][string],
	mutationPlan: CompiledDomainMutationPlan,
	guards: DomainGuardRuntime | undefined,
	capabilities: Readonly<Record<string, DomainCapabilityHandler>>,
): RunMutationPathInput => ({
	entrypointId: execution.entrypointId,
	action,
	capabilities,
	input: applyMutationInputBindings({
		payload: execution.input,
		mutationPlan,
	}),
	principal: execution.principal,
	...(guards === undefined ? {} : { guardRuntime: guards }),
	ctx: execution.ctx,
});

type ResolveActionResult =
	| {
			readonly ok: true;
			readonly action: CompiledDomainRuntimeIR["actions"][string];
			readonly actionId: string;
			readonly mutationPlan: CompiledDomainMutationPlan;
	  }
	| { readonly ok: false; readonly envelope: DomainMutationEnvelope };

export const resolveMutationAction = (input: {
	readonly domainRuntimeIR: CompiledDomainRuntimeIR;
	readonly execution: RuntimeExecutionInput;
}): ResolveActionResult => {
	const mutationPlan =
		input.domainRuntimeIR.mutations[input.execution.entrypointId];
	if (mutationPlan === undefined) {
		return {
			ok: false,
			envelope: buildActionNotFoundEnvelope(
				input.execution,
				"No compiled mutation runtime plan exists for this entrypoint.",
				{ entrypointId: input.execution.entrypointId },
			),
		};
	}

	const action = input.domainRuntimeIR.actions[mutationPlan.actionId];
	if (action === undefined) {
		return {
			ok: false,
			envelope: buildActionNotFoundEnvelope(
				input.execution,
				"Compiled mutation runtime plan references an unknown action.",
				{
					entrypointId: input.execution.entrypointId,
					actionId: mutationPlan.actionId,
				},
				mutationPlan.actionId,
			),
		};
	}
	return {
		ok: true,
		actionId: mutationPlan.actionId,
		action,
		mutationPlan,
	};
};

export const mapActionResolveFailureToPreparation = (
	envelope: DomainMutationEnvelope,
): KernelSemanticMutationPreparationResult => ({
	ok: false,
	error: envelope.error,
	observedEffects: envelope.observedEffects,
	emittedSignals: envelope.emittedSignals,
});

export const mapActionResolveFailureToCore = (
	envelope: DomainMutationEnvelope,
): KernelSemanticMutationCoreResult => ({
	ok: false,
	actionId: envelope.actionId,
	stepOutputs: {},
	error: envelope.error,
	observedEffects: envelope.observedEffects,
	emittedSignals: envelope.emittedSignals,
});
