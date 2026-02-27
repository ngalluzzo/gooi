import { createProjectionError } from "@gooi/projection-contracts/errors/projection-errors";
import type { ProjectionSourceRef } from "@gooi/projection-contracts/plans/projection-plan";
import type { TimelineAccumulationState } from "@gooi/projection-contracts/plans/timeline-history-policy";

/**
 * Applies accumulation hash drift gating for timeline projections.
 */
export const applyTimelineRebuildGate = (
	state: TimelineAccumulationState | undefined,
	sourceRef: ProjectionSourceRef,
):
	| { readonly ok: true }
	| {
			readonly ok: false;
			readonly error: ReturnType<typeof createProjectionError>;
	  } => {
	if (state === undefined) {
		return { ok: true };
	}
	if (state.persistedAccumulationHash === undefined) {
		return { ok: true };
	}
	if (state.persistedAccumulationHash === state.compiledAccumulationHash) {
		return { ok: true };
	}
	return {
		ok: false,
		error: createProjectionError(
			"projection_rebuild_required_error",
			"Timeline accumulation hash drift detected; rebuild is required.",
			sourceRef,
			{
				compiledAccumulationHash: state.compiledAccumulationHash,
				persistedAccumulationHash: state.persistedAccumulationHash,
			},
		),
	};
};
