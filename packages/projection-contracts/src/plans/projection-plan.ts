import type { CompiledTimelineHistoryPolicy } from "./timeline-history-policy";

/**
 * Projection strategies supported by the runtime executor.
 */
export type ProjectionStrategy =
	| "from_collection"
	| "join"
	| "aggregate"
	| "timeline";

/**
 * Source reference carried on typed diagnostics for projection plans.
 */
export interface ProjectionSourceRef {
	/** Projection id that produced the diagnostic. */
	readonly projectionId: string;
	/** Canonical authored path inside projection config. */
	readonly path: string;
	/** Strategy context for diagnostic rendering. */
	readonly strategy: ProjectionStrategy;
}

/**
 * Deterministic sort rule declaration.
 */
export interface ProjectionSortRule {
	/** Row field path used for sort comparison. */
	readonly field: string;
	/** Sort direction. */
	readonly direction: "asc" | "desc";
}

/**
 * Page-mode pagination contract used by all runtime strategies.
 */
export interface ProjectionPaginationPlan {
	/** Pagination mode. */
	readonly mode: "page";
	/** Query arg that carries page number. */
	readonly pageArg: string;
	/** Query arg that carries page size. */
	readonly pageSizeArg: string;
	/** Default page number. */
	readonly defaultPage: number;
	/** Default page size. */
	readonly defaultPageSize: number;
	/** Max allowed page size. */
	readonly maxPageSize: number;
}

/**
 * One output field selection from a row value path.
 */
export interface ProjectionFieldSelection {
	/** Source field path used to read the value. */
	readonly source: string;
	/** Output field name for the projection result row. */
	readonly as: string;
}

/**
 * Projection plan for `from_collection` strategy.
 */
export interface CompiledFromCollectionProjectionPlan {
	readonly projectionId: string;
	readonly strategy: "from_collection";
	readonly sourceRef: ProjectionSourceRef;
	readonly collectionId: string;
	readonly fields: readonly ProjectionFieldSelection[];
	readonly sort: readonly ProjectionSortRule[];
	readonly pagination: ProjectionPaginationPlan;
}

/**
 * Join edge contract for join and aggregate strategies.
 */
export interface ProjectionJoinEdgePlan {
	readonly collectionId: string;
	readonly alias: string;
	readonly type: "left" | "inner";
	readonly on: {
		readonly leftField: string;
		readonly rightField: string;
	};
}

/**
 * Projection plan for `join` strategy.
 */
export interface CompiledJoinProjectionPlan {
	readonly projectionId: string;
	readonly strategy: "join";
	readonly sourceRef: ProjectionSourceRef;
	readonly primary: {
		readonly collectionId: string;
		readonly alias: string;
	};
	readonly joins: readonly ProjectionJoinEdgePlan[];
	readonly fields: readonly ProjectionFieldSelection[];
	readonly sort: readonly ProjectionSortRule[];
	readonly pagination: ProjectionPaginationPlan;
}

/**
 * Group-by field contract used by aggregate projections.
 */
export interface ProjectionGroupByFieldPlan {
	readonly field: string;
	readonly as: string;
}

/**
 * Aggregate metric contract.
 */
export interface ProjectionAggregateMetricPlan {
	readonly metricId: string;
	readonly op: "count" | "min" | "max";
	readonly field?: string;
}

/**
 * Projection plan for `aggregate` strategy.
 */
export interface CompiledAggregateProjectionPlan {
	readonly projectionId: string;
	readonly strategy: "aggregate";
	readonly sourceRef: ProjectionSourceRef;
	readonly primary: {
		readonly collectionId: string;
		readonly alias: string;
	};
	readonly joins: readonly ProjectionJoinEdgePlan[];
	readonly groupBy: readonly ProjectionGroupByFieldPlan[];
	readonly metrics: readonly ProjectionAggregateMetricPlan[];
	readonly sort: readonly ProjectionSortRule[];
	readonly pagination: ProjectionPaginationPlan;
}

/**
 * Timeline reducer operation.
 */
export type TimelineReducerOperation =
	| {
			readonly op: "set";
			readonly field: string;
			readonly valueFrom: "payload" | "signal" | "literal";
			readonly path?: string;
			readonly value?: unknown;
	  }
	| {
			readonly op: "inc" | "dec";
			readonly field: string;
			readonly value?: number;
	  };

/**
 * Projection plan for `timeline` strategy.
 */
export interface CompiledTimelineProjectionPlan {
	readonly projectionId: string;
	readonly strategy: "timeline";
	readonly sourceRef: ProjectionSourceRef;
	readonly signals: readonly string[];
	readonly groupByField: string | null;
	readonly orderBy: ProjectionSortRule;
	readonly start: Readonly<Record<string, unknown>> | null;
	readonly reducers: Readonly<
		Record<string, readonly TimelineReducerOperation[]>
	>;
	readonly pagination: ProjectionPaginationPlan;
	readonly history: CompiledTimelineHistoryPolicy;
}

/**
 * Canonical discriminated projection strategy plan.
 */
export type CompiledProjectionPlan =
	| CompiledFromCollectionProjectionPlan
	| CompiledJoinProjectionPlan
	| CompiledAggregateProjectionPlan
	| CompiledTimelineProjectionPlan;

/**
 * Compiled query to projection binding contract.
 */
export interface CompiledQueryProjectionPlan {
	readonly queryId: string;
	readonly projectionId: string;
	/** True when query can carry a non-null `as_of` argument. */
	readonly allowsAsOf: boolean;
	readonly sourceRef: {
		readonly queryId: string;
		readonly path: string;
	};
}
