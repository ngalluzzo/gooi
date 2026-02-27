/**
 * Canonical immutable history record persisted for timeline projections.
 */
export interface HistoryRecord {
	readonly signalName: string;
	readonly signalVersion: number;
	readonly eventKey: string;
	readonly emittedAt: string;
	readonly traceId: string;
	readonly payload: Readonly<Record<string, unknown>>;
}

/**
 * Canonical ordering contract for history scans.
 */
export interface HistoryOrderBy {
	readonly field: string;
	readonly direction: "asc" | "desc";
}

/**
 * History append operation input.
 */
export type HistoryAppendInput = HistoryRecord;

/**
 * History scan operation input.
 */
export interface HistoryScanInput {
	readonly signals: readonly string[];
	readonly orderBy: HistoryOrderBy;
	readonly groupBy?: string | null;
	readonly afterEventKey?: string;
	readonly limit?: number;
}

/**
 * History scan_as_of operation input.
 */
export interface HistoryScanAsOfInput extends HistoryScanInput {
	readonly asOf: string;
}

/**
 * History rebuild operation input.
 */
export interface HistoryRebuildInput {
	readonly signals: readonly string[];
	readonly groupBy: string | null;
	readonly orderBy: HistoryOrderBy;
	readonly fromTimestamp?: string;
	readonly start: Readonly<Record<string, unknown>> | null;
	readonly handlers: Readonly<Record<string, unknown>> | null;
}

/**
 * History scan operation result payload.
 */
export interface HistoryScanResult {
	readonly records: readonly HistoryRecord[];
	readonly nextAfterEventKey?: string;
	readonly historyComplete: boolean;
}

/**
 * History provider runtime contract consumed by projection runtime.
 */
export interface HistoryPort {
	readonly append: (input: HistoryAppendInput) => Promise<void>;
	readonly scan: (input: HistoryScanInput) => Promise<HistoryScanResult>;
	readonly scanAsOf?: (
		input: HistoryScanAsOfInput,
	) => Promise<HistoryScanResult>;
	readonly rebuild: (input: HistoryRebuildInput) => Promise<void>;
	readonly persist: (input: {
		readonly projectionId: string;
		readonly rows: readonly Readonly<Record<string, unknown>>[];
	}) => Promise<void>;
}
