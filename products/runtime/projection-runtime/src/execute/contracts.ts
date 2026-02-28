import type { ProjectionSemanticPageMeta } from "@gooi/kernel-contracts/projection-semantic";
import type { ProjectionTypedError } from "@gooi/projection-contracts/errors";
import type { TimelineAccumulationState } from "@gooi/projection-contracts/plans";
import type { HistoryPort } from "@gooi/projection-contracts/ports";
import type { ProjectionCollectionReaderPort } from "../ports/collection-reader";

export interface ExecuteProjectionContext {
	readonly args: Readonly<Record<string, unknown>>;
	readonly asOf: string | null;
	readonly collectionReader: ProjectionCollectionReaderPort;
	readonly historyPort?: HistoryPort;
	readonly timelineState?: TimelineAccumulationState;
}

export interface StrategyExecutionSuccess {
	readonly rows: readonly Readonly<Record<string, unknown>>[];
	readonly pagination: ProjectionSemanticPageMeta;
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
