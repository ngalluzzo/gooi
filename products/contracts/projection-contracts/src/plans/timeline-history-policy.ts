import { z } from "zod";

/**
 * Supported rebuild lifecycle statuses for timeline projections.
 */
export const timelineRebuildStatusSchema = z.enum([
	"in_progress",
	"complete",
	"failed",
	"stale",
]);

/**
 * Timeline rebuild lifecycle status.
 */
export type TimelineRebuildStatus = z.infer<typeof timelineRebuildStatusSchema>;

/**
 * History window declaration for timeline scans.
 */
export interface TimelineHistoryWindowPlan {
	/** Query input arg used for history cursor continuation. */
	readonly afterEventKeyArg?: string;
	/** Query input arg used for history-window limit override. */
	readonly limitArg?: string;
	/** Default history-window size when args do not override it. */
	readonly defaultLimit: number;
	/** Max accepted history-window limit. */
	readonly maxLimit: number;
}

/**
 * Timeline rebuild mode contract.
 */
export type TimelineRebuildMode = "full" | "from_timestamp" | "none";

/**
 * Timeline rebuild policy.
 */
export interface TimelineRebuildPolicy {
	/** Rebuild mode declared for this timeline projection. */
	readonly mode: TimelineRebuildMode;
	/** Optional timestamp for `from_timestamp` rebuild mode. */
	readonly fromTimestamp?: string;
}

/**
 * Compiled timeline history policy.
 */
export interface CompiledTimelineHistoryPolicy {
	/** History capability ids this projection requires at runtime. */
	readonly requiredCapabilities: readonly [
		"history.scan",
		"history.rebuild",
		"history.persist",
		...string[],
	];
	/** History window contract for stable scan pagination. */
	readonly window: TimelineHistoryWindowPlan;
	/** Rebuild behavior policy for this timeline projection. */
	readonly rebuild: TimelineRebuildPolicy;
}

/**
 * Persisted timeline accumulation state metadata used for stale-hash gating.
 */
export interface TimelineAccumulationState {
	/** Compiled accumulation hash from the active artifact. */
	readonly compiledAccumulationHash: string;
	/** Persisted accumulation hash from provider state. */
	readonly persistedAccumulationHash?: string;
	/** Current rebuild lifecycle status. */
	readonly rebuildStatus: TimelineRebuildStatus;
	/** Optional rebuild progress [0,1] when in progress. */
	readonly rebuildProgress?: number | null;
	/** Timestamp when rebuild was started, if known. */
	readonly rebuildStartedAt?: string | null;
	/** Whether retained history can fully satisfy the projection. */
	readonly historyComplete: boolean;
}
