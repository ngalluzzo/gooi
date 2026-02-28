/**
 * Canonical boundary contract API.
 */
import * as projection_plan from "./projection-plan";
import * as timeline_history_policy from "./timeline-history-policy";

export type {
	CompiledAggregateProjectionPlan,
	CompiledFromCollectionProjectionPlan,
	CompiledJoinProjectionPlan,
	CompiledProjectionIR,
	CompiledProjectionPlan,
	CompiledQueryProjectionPlan,
	CompiledTimelineProjectionPlan,
	ProjectionAggregateMetricPlan,
	ProjectionFieldSelection,
	ProjectionGroupByFieldPlan,
	ProjectionJoinEdgePlan,
	ProjectionPaginationPlan,
	ProjectionSortRule,
	ProjectionSourceRef,
	ProjectionStrategy,
	TimelineReducerOperation,
} from "./projection-plan";
export type {
	CompiledSignalReplayPolicy,
	SignalMigrationCoercion,
	SignalMigrationOperation,
	SignalMigrationStepPlan,
	SignalReplayPlan,
} from "./signal-migration-plan";
export type {
	CompiledTimelineHistoryPolicy,
	TimelineAccumulationState,
	TimelineHistoryWindowPlan,
	TimelineRebuildMode,
	TimelineRebuildPolicy,
	TimelineRebuildStatus,
} from "./timeline-history-policy";

export const plansContracts = Object.freeze({
	compiledProjectionIRVersion: projection_plan.compiledProjectionIRVersion,
	timelineRebuildStatusSchema:
		timeline_history_policy.timelineRebuildStatusSchema,
});
