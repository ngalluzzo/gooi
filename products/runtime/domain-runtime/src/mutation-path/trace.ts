import type {
	DomainRuntimeMode,
	DomainTraceEnvelope,
	DomainTraceStep,
} from "../execution-core/envelopes";

interface CreateTraceInput {
	readonly mode: DomainRuntimeMode;
	readonly entrypointId: string;
	readonly actionId: string;
	readonly invocationId: string;
	readonly traceId: string;
}

interface TraceStepInput {
	readonly stepId: string;
	readonly capabilityId?: string | undefined;
	readonly phase: DomainTraceStep["phase"];
	readonly status: DomainTraceStep["status"];
	readonly detail?: Readonly<Record<string, unknown>> | undefined;
}

const toTraceStep = (input: TraceStepInput): DomainTraceStep => ({
	stepId: input.stepId,
	phase: input.phase,
	status: input.status,
	...(input.capabilityId === undefined
		? {}
		: { capabilityId: input.capabilityId }),
	...(input.detail === undefined ? {} : { detail: input.detail }),
});

/**
 * Creates a deterministic trace envelope for one action execution run.
 */
export const createActionTrace = (
	input: CreateTraceInput,
): DomainTraceEnvelope => ({
	mode: input.mode,
	entrypointId: input.entrypointId,
	actionId: input.actionId,
	invocationId: input.invocationId,
	traceId: input.traceId,
	steps: [],
});

/**
 * Appends one ordered trace step record.
 */
export const appendActionTraceStep = (
	trace: DomainTraceEnvelope,
	step: TraceStepInput,
): DomainTraceEnvelope => ({
	...trace,
	steps: [...trace.steps, toTraceStep(step)],
});
