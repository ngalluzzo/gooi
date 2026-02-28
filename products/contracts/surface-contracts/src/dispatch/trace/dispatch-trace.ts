import { z } from "zod";
import { dispatchErrorSchema } from "../error/contracts";
import { compiledDispatchHandlerSchema } from "../plan/plans";

/**
 * Stable dispatch trace decision kinds.
 */
export const dispatchTraceDecisionSchema = z.enum([
	"candidate_considered",
	"candidate_matched",
	"candidate_rejected",
	"winner_selected",
	"ambiguous_top_match",
	"no_match",
]);

/**
 * Dispatch trace decision kind.
 */
export type DispatchTraceDecision = z.infer<typeof dispatchTraceDecisionSchema>;

/**
 * Runtime schema for one dispatch trace step.
 */
export const dispatchTraceStepSchema = z
	.object({
		handlerId: z.string().min(1),
		decision: dispatchTraceDecisionSchema,
		reason: z.string().min(1),
	})
	.strict();

/**
 * One dispatch trace step.
 */
export type DispatchTraceStep = z.infer<typeof dispatchTraceStepSchema>;

/**
 * Runtime schema for one dispatch trace envelope.
 */
export const dispatchTraceEnvelopeSchema = z
	.object({
		surfaceId: z.string().min(1),
		candidates: z.array(compiledDispatchHandlerSchema),
		selectedHandlerId: z.string().min(1).optional(),
		steps: z.array(dispatchTraceStepSchema),
		error: dispatchErrorSchema.optional(),
	})
	.strict();

/**
 * Dispatch trace envelope.
 */
export type DispatchTraceEnvelope = z.infer<typeof dispatchTraceEnvelopeSchema>;

/**
 * Parses one untrusted dispatch trace envelope.
 */
export const parseDispatchTraceEnvelope = (
	value: unknown,
): DispatchTraceEnvelope => dispatchTraceEnvelopeSchema.parse(value);
