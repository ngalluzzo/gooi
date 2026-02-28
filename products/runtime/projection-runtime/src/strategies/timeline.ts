import type { CompiledTimelineProjectionPlan } from "@gooi/projection-contracts/plans";
import type {
	ExecuteProjectionContext,
	StrategyExecutionResult,
} from "../execute/contracts";
import { accumulateTimelineRows } from "../history/accumulate-timeline-rows";
import { dedupeHistoryRecords } from "../history/dedupe-history-records";
import { enforceHistoryContractGate } from "../history/history-contract-gate";
import { orderHistoryRecords } from "../history/order-history-records";
import { applyTimelineRebuildGate } from "../history/rebuild-gate";
import { scanTimelineHistoryWindow } from "../history/scan-history-window";
import { applyTimelineSignalMigrations } from "../history/signal-migrations";
import { applyPagination } from "../shared/pagination";
import { sortRowsDeterministically } from "../shared/sort";

/**
 * Executes a deterministic `timeline` projection strategy.
 */
export const executeTimelineProjection = async (
	plan: CompiledTimelineProjectionPlan,
	context: ExecuteProjectionContext,
): Promise<StrategyExecutionResult> => {
	const historyContract = enforceHistoryContractGate({
		historyPort: context.historyPort,
		requiredCapabilities: plan.history.requiredCapabilities,
		asOf: context.asOf,
		sourceRef: plan.sourceRef,
	});
	if (!historyContract.ok) {
		return {
			ok: false,
			error: historyContract.error,
		};
	}

	const rebuildGate = applyTimelineRebuildGate(
		context.timelineState,
		plan.sourceRef,
	);
	if (!rebuildGate.ok) {
		return {
			ok: false,
			error: rebuildGate.error,
		};
	}

	const scanned = await scanTimelineHistoryWindow({
		historyPort: context.historyPort,
		plan,
		args: context.args,
		asOf: context.asOf,
		sourceRef: plan.sourceRef,
	});
	if (!scanned.ok) {
		return {
			ok: false,
			error: scanned.error,
		};
	}

	const deduped = dedupeHistoryRecords(scanned.value.records, plan.sourceRef);
	if (!deduped.ok) {
		return {
			ok: false,
			error: deduped.error,
		};
	}
	const migrated = applyTimelineSignalMigrations(plan, deduped.records);
	if (!migrated.ok) {
		return {
			ok: false,
			error: migrated.error,
		};
	}
	const ordered = orderHistoryRecords(migrated.records, plan.orderBy);
	const accumulatedRows = accumulateTimelineRows(plan, ordered);
	const sortedRows = sortRowsDeterministically(accumulatedRows, []);
	const paged = applyPagination({
		rows: sortedRows,
		pagination: plan.pagination,
		args: context.args,
		sourceRef: plan.sourceRef,
	});
	if (!paged.ok) {
		return {
			ok: false,
			error: paged.error,
		};
	}

	return {
		ok: true,
		value: {
			rows: paged.value.rows,
			pagination: paged.value.meta,
			timeline: {
				rebuildStatus: context.timelineState?.rebuildStatus ?? "complete",
				rebuildProgress: context.timelineState?.rebuildProgress ?? null,
				rebuildStartedAt: context.timelineState?.rebuildStartedAt ?? null,
				historyComplete:
					scanned.value.historyComplete &&
					(context.timelineState?.historyComplete ?? true),
				asOfApplied: context.asOf,
			},
		},
	};
};
