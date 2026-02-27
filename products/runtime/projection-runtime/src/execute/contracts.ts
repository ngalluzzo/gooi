import type { ProjectionPageMeta } from "@gooi/projection-contracts/envelopes/projection-result-envelope";
import type { ProjectionTypedError } from "@gooi/projection-contracts/errors/projection-errors";
import type { TimelineAccumulationState } from "@gooi/projection-contracts/plans/timeline-history-policy";
import type { HistoryPort } from "@gooi/projection-contracts/ports/history-port-contract";
import type { ProjectionCollectionReaderPort } from "../ports/collection-reader";

export interface ExecuteProjectionContext {
	readonly args: Readonly<Record<string, unknown>>;
	readonly asOf: string | null;
	readonly collectionReader: ProjectionCollectionReaderPort;
	readonly historyPort?: HistoryPort;
	readonly artifactHash: string;
	readonly timelineState?: TimelineAccumulationState;
}

export interface StrategyExecutionSuccess {
	readonly rows: readonly Readonly<Record<string, unknown>>[];
	readonly pagination: ProjectionPageMeta;
	readonly timeline?: {
		readonly rebuildStatus: "in_progress" | "complete" | "failed" | "stale";
		readonly rebuildProgress: number | null;
		readonly rebuildStartedAt: string | null;
		readonly historyComplete: boolean;
		readonly asOfApplied: string | null;
	};
}

export type StrategyExecutionResult =
	| { readonly ok: true; readonly value: StrategyExecutionSuccess }
	| { readonly ok: false; readonly error: ProjectionTypedError };
