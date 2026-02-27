import type { ProjectionResultEnvelope } from "@gooi/projection-contracts/envelopes/projection-result-envelope";
import type {
	CompiledAggregateProjectionPlan,
	CompiledTimelineProjectionPlan,
} from "@gooi/projection-contracts/plans/projection-plan";
import type { HistoryPort } from "@gooi/projection-contracts/ports/history-port-contract";
import type { ProjectionRuntime } from "@gooi/projection-runtime";
import type { ProjectionRefreshSubscriptions } from "@gooi/projection-runtime/refresh";

/**
 * Minimal collection reader contract consumed by projection conformance fixtures.
 */
export interface ProjectionCollectionReaderPort {
	readonly scanCollection: (input: {
		readonly collectionId: string;
	}) => Promise<readonly Readonly<Record<string, unknown>>[]>;
}

/**
 * Named conformance checks for projection runtime behavior.
 */
export type ProjectionConformanceCheckId =
	| "refresh_invalidation_parity"
	| "projection_output_matches_mutation_fixture"
	| "history_contract_gate_enforced"
	| "stale_read_blocked"
	| "rebuild_workflow_restores_queryability"
	| "as_of_capability_gate_enforced"
	| "duplicate_event_key_deduped"
	| "migration_chain_replay_applied"
	| "migration_chain_gap_blocked";

/**
 * Result for one projection conformance check.
 */
export interface ProjectionConformanceCheckResult {
	readonly id: ProjectionConformanceCheckId;
	readonly passed: boolean;
	readonly detail: string;
}

/**
 * Projection conformance report payload.
 */
export interface ProjectionConformanceReport {
	readonly passed: boolean;
	readonly checks: readonly ProjectionConformanceCheckResult[];
	readonly lastTimelineResult?: ProjectionResultEnvelope;
}

/**
 * Input payload required for projection conformance checks.
 */
export interface RunProjectionConformanceInput {
	readonly runtime: ProjectionRuntime;
	readonly aggregatePlan: CompiledAggregateProjectionPlan;
	readonly timelinePlan: CompiledTimelineProjectionPlan;
	readonly timelineMigrationPlan: CompiledTimelineProjectionPlan;
	readonly timelineMigrationPlanWithGap: CompiledTimelineProjectionPlan;
	readonly collectionReader: ProjectionCollectionReaderPort;
	readonly historyPort: HistoryPort;
	readonly historyPortWithoutAsOf: Omit<HistoryPort, "scanAsOf">;
	readonly historyPortWithoutPersist: Omit<HistoryPort, "persist">;
	readonly versionedHistoryPort: HistoryPort;
	readonly refreshSubscriptions: ProjectionRefreshSubscriptions;
	readonly emittedSignalIds: readonly string[];
	readonly expectedAffectedQueryIds: readonly string[];
	readonly expectedAggregateRows: readonly Readonly<Record<string, unknown>>[];
}
