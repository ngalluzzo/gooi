import { normalizeObservedEffects } from "../execution-core/effects/normalize-observed-effects";
import {
	type DomainQueryEnvelope,
	domainRuntimeEnvelopeVersion,
} from "../execution-core/envelopes";
import { createDomainRuntimeError } from "../execution-core/errors";
import type { DomainQueryHandler } from "./contracts";
import { buildQueryFailureEnvelope } from "./failure-envelope";

export interface QueryPathExecutionInput {
	readonly entrypointId: string;
	readonly input: Readonly<Record<string, unknown>>;
	readonly principal: Parameters<DomainQueryHandler["run"]>[0]["principal"];
	readonly ctx: Parameters<DomainQueryHandler["run"]>[0]["ctx"];
}

const buildQueryTrace = (execution: QueryPathExecutionInput) => ({
	mode: execution.ctx.mode,
	entrypointId: execution.entrypointId,
	invocationId: execution.ctx.invocationId,
	traceId: execution.ctx.traceId,
	steps: [],
});

/**
 * Executes the canonical query runtime path.
 */
export const runQueryPath = async (input: {
	readonly execution: QueryPathExecutionInput;
	readonly queryPlan?: { readonly queryId: string };
	readonly queryHandlers?: Readonly<Record<string, DomainQueryHandler>>;
}): Promise<DomainQueryEnvelope> => {
	if (input.queryPlan === undefined) {
		return buildQueryFailureEnvelope({
			mode: input.execution.ctx.mode,
			entrypointId: input.execution.entrypointId,
			error: createDomainRuntimeError(
				"query_not_found_error",
				"No compiled query runtime plan exists for this entrypoint.",
				{ entrypointId: input.execution.entrypointId },
			),
			trace: buildQueryTrace(input.execution),
			observedEffects: [],
		});
	}
	const handler = input.queryHandlers?.[input.queryPlan.queryId];
	const trace = buildQueryTrace(input.execution);
	if (handler === undefined) {
		return buildQueryFailureEnvelope({
			mode: input.execution.ctx.mode,
			entrypointId: input.execution.entrypointId,
			error: createDomainRuntimeError(
				"query_not_found_error",
				"No query handler exists for the compiled query runtime plan.",
				{
					entrypointId: input.execution.entrypointId,
					queryId: input.queryPlan.queryId,
				},
			),
			trace,
			observedEffects: [],
		});
	}

	const result = await handler.run(input.execution);
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
		return buildQueryFailureEnvelope({
			mode: input.execution.ctx.mode,
			entrypointId: input.execution.entrypointId,
			error: createDomainRuntimeError(
				"capability_invocation_error",
				"Query handler returned a failed typed result.",
				{ entrypointId: input.execution.entrypointId, error: result.error },
			),
			trace: traced,
			observedEffects: result.observedEffects,
		});
	}

	return {
		envelopeVersion: domainRuntimeEnvelopeVersion,
		mode: input.execution.ctx.mode,
		entrypointId: input.execution.entrypointId,
		ok: true,
		output: result.output,
		observedEffects: normalizeObservedEffects(result.observedEffects),
		trace: traced,
	};
};
