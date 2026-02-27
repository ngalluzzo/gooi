import type { ProjectionSemanticExecutionResult } from "@gooi/kernel-contracts/projection-semantic";
import {
	type ProjectionResultEnvelope,
	projectionResultEnvelopeVersion,
} from "@gooi/projection-contracts/envelopes/projection-result-envelope";
import type { CompiledProjectionPlan } from "@gooi/projection-contracts/plans/projection-plan";

export interface ShapeProjectionQueryOutputInput {
	readonly plan: CompiledProjectionPlan;
	readonly artifactHash: string;
	readonly result: ProjectionSemanticExecutionResult;
}

/**
 * Shapes projection semantic-engine output into the canonical projection result envelope.
 */
export const shapeProjectionQueryOutput = (
	input: ShapeProjectionQueryOutputInput,
): ProjectionResultEnvelope => {
	if (!input.result.ok) {
		return {
			envelopeVersion: projectionResultEnvelopeVersion,
			ok: false,
			error: input.result.error,
		};
	}

	return {
		envelopeVersion: projectionResultEnvelopeVersion,
		ok: true,
		rows: input.result.rows,
		meta: {
			projectionId: input.plan.projectionId,
			strategy: input.plan.strategy,
			artifactHash: input.artifactHash,
			pagination: input.result.pagination,
			...(input.result.timeline === undefined
				? {}
				: { timeline: input.result.timeline }),
			...(input.result.guards === undefined
				? {}
				: { guards: input.result.guards }),
		},
	};
};
