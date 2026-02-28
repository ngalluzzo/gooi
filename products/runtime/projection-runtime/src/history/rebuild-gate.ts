import { errorsContracts } from "@gooi/projection-contracts/errors";
import type {
	ProjectionSourceRef,
	TimelineAccumulationState,
} from "@gooi/projection-contracts/plans";

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
			readonly error: ReturnType<typeof errorsContracts.createProjectionError>;
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
		error: errorsContracts.createProjectionError(
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
