import type { ProjectionTypedError } from "@gooi/projection-contracts/errors/projection-errors";
import type { CompiledTimelineProjectionPlan } from "@gooi/projection-contracts/plans/projection-plan";
import type { TimelineAccumulationState } from "@gooi/projection-contracts/plans/timeline-history-policy";
import type {
	HistoryPort,
	HistoryRecord,
} from "@gooi/projection-contracts/ports/history-port-contract";
import { accumulateTimelineRows } from "../history/accumulate-timeline-rows";
import { dedupeHistoryRecords } from "../history/dedupe-history-records";
import { enforceHistoryContractGate } from "../history/history-contract-gate";
import { orderHistoryRecords } from "../history/order-history-records";
import { applyTimelineSignalMigrations } from "../history/signal-migrations";
import { createProviderError } from "../shared/errors";

/**
 * Input payload for explicit timeline rebuild execution.
 */
export interface RebuildTimelineProjectionInput {
	readonly plan: CompiledTimelineProjectionPlan;
	readonly historyPort: HistoryPort;
	readonly compiledAccumulationHash: string;
	readonly rebuildStartedAt?: string | null;
}

/**
 * Result payload for explicit timeline rebuild execution.
 */
export type RebuildTimelineProjectionResult =
	| {
			readonly ok: true;
			readonly timelineState: TimelineAccumulationState;
			readonly persistedRowCount: number;
	  }
	| {
			readonly ok: false;
			readonly error: ProjectionTypedError;
	  };

const scanAllTimelineHistory = async (
	plan: CompiledTimelineProjectionPlan,
	historyPort: HistoryPort,
): Promise<{
	readonly records: readonly HistoryRecord[];
	readonly historyComplete: boolean;
}> => {
	if (plan.history.rebuild.mode === "none") {
		return { records: [], historyComplete: true };
	}

	const records: HistoryRecord[] = [];
	let afterEventKey: string | undefined;
	let historyComplete = true;
	const seenCursors = new Set<string>();

	while (true) {
		const scanned = await historyPort.scan({
			signals: plan.signals,
			orderBy: plan.orderBy,
			groupBy: plan.groupByField,
			limit: plan.history.window.maxLimit,
			...(afterEventKey === undefined ? {} : { afterEventKey }),
		});
		records.push(...scanned.records);
		historyComplete = historyComplete && scanned.historyComplete;

		if (
			scanned.nextAfterEventKey === undefined ||
			scanned.records.length === 0
		) {
			break;
		}
		if (seenCursors.has(scanned.nextAfterEventKey)) {
			break;
		}
		seenCursors.add(scanned.nextAfterEventKey);
		afterEventKey = scanned.nextAfterEventKey;
	}

	return { records, historyComplete };
};

/**
 * Executes explicit timeline rebuild workflow and returns aligned timeline state.
 */
export const rebuildTimelineProjection = async (
	input: RebuildTimelineProjectionInput,
): Promise<RebuildTimelineProjectionResult> => {
	const historyGate = enforceHistoryContractGate({
		historyPort: input.historyPort,
		requiredCapabilities: input.plan.history.requiredCapabilities,
		asOf: null,
		sourceRef: input.plan.sourceRef,
	});
	if (!historyGate.ok) {
		return { ok: false, error: historyGate.error };
	}

	try {
		const rebuildInput = {
			signals: input.plan.signals,
			groupBy: input.plan.groupByField,
			orderBy: input.plan.orderBy,
			start: input.plan.start,
			handlers: input.plan.reducers as Readonly<Record<string, unknown>> | null,
			...(input.plan.history.rebuild.mode === "from_timestamp" &&
			typeof input.plan.history.rebuild.fromTimestamp === "string"
				? { fromTimestamp: input.plan.history.rebuild.fromTimestamp }
				: {}),
		};
		if (input.plan.history.rebuild.mode !== "none") {
			await input.historyPort.rebuild(rebuildInput);
		}

		const scanned = await scanAllTimelineHistory(input.plan, input.historyPort);
		const deduped = dedupeHistoryRecords(scanned.records, input.plan.sourceRef);
		if (!deduped.ok) {
			return { ok: false, error: deduped.error };
		}
		const migrated = applyTimelineSignalMigrations(input.plan, deduped.records);
		if (!migrated.ok) {
			return { ok: false, error: migrated.error };
		}
		const ordered = orderHistoryRecords(migrated.records, input.plan.orderBy);
		const rows = accumulateTimelineRows(input.plan, ordered);
		await input.historyPort.persist({
			projectionId: input.plan.projectionId,
			rows,
		});

		return {
			ok: true,
			persistedRowCount: rows.length,
			timelineState: {
				compiledAccumulationHash: input.compiledAccumulationHash,
				persistedAccumulationHash: input.compiledAccumulationHash,
				rebuildStatus: "complete",
				rebuildProgress: null,
				rebuildStartedAt: input.rebuildStartedAt ?? null,
				historyComplete: scanned.historyComplete,
			},
		};
	} catch (error) {
		return {
			ok: false,
			error: createProviderError(
				"Timeline rebuild failed due to provider/runtime exception.",
				input.plan.sourceRef,
				{
					error:
						error instanceof Error
							? { name: error.name, message: error.message }
							: { value: String(error) },
				},
			),
		};
	}
};
