import type { ProjectionSemanticExecutionResult } from "@gooi/kernel-contracts/projection-semantic";
import {
	envelopesContracts,
	type ProjectionResultEnvelope,
} from "@gooi/projection-contracts/envelopes";
import type { CompiledProjectionPlan } from "@gooi/projection-contracts/plans";

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
			envelopeVersion: envelopesContracts.projectionResultEnvelopeVersion,
			ok: false,
			error: input.result.error,
		};
	}

	return {
		envelopeVersion: envelopesContracts.projectionResultEnvelopeVersion,
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
