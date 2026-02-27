import type {
	CompiledTimelineProjectionPlan,
	TimelineReducerOperation,
} from "@gooi/projection-contracts/plans/projection-plan";
import type { HistoryRecord } from "@gooi/projection-contracts/ports/history-port-contract";
import type {
	ExecuteProjectionContext,
	StrategyExecutionResult,
} from "../execute/contracts";
import { dedupeHistoryRecords } from "../history/dedupe-history-records";
import { orderHistoryRecords } from "../history/order-history-records";
import { applyTimelineRebuildGate } from "../history/rebuild-gate";
import { scanTimelineHistoryWindow } from "../history/scan-history-window";
import { readFieldPath } from "../shared/field-path";
import { applyPagination } from "../shared/pagination";
import { sortRowsDeterministically } from "../shared/sort";

const toTimelineRow = (
	record: HistoryRecord,
): Readonly<Record<string, unknown>> => ({
	signal_name: record.signalName,
	signal_version: record.signalVersion,
	event_key: record.eventKey,
	emitted_at: record.emittedAt,
	trace_id: record.traceId,
	payload: record.payload,
});

const deepClone = (
	value: Readonly<Record<string, unknown>>,
): Record<string, unknown> =>
	JSON.parse(JSON.stringify(value)) as Record<string, unknown>;

const resolveSetValue = (
	op: Extract<TimelineReducerOperation, { readonly op: "set" }>,
	record: HistoryRecord,
): unknown => {
	if (op.valueFrom === "literal") {
		return op.value;
	}
	const context: Readonly<Record<string, unknown>> = {
		payload: record.payload,
		signal: {
			emittedAt: record.emittedAt,
			eventKey: record.eventKey,
			signalName: record.signalName,
			traceId: record.traceId,
		},
	};
	return op.path === undefined ? undefined : readFieldPath(context, op.path);
};

const applyReducer = (
	state: Record<string, unknown>,
	op: TimelineReducerOperation,
	record: HistoryRecord,
): void => {
	if (op.op === "set") {
		state[op.field] = resolveSetValue(op, record);
		return;
	}
	const current = state[op.field];
	const base = typeof current === "number" ? current : 0;
	const delta = op.value ?? 1;
	state[op.field] = op.op === "inc" ? base + delta : base - delta;
};

const accumulateTimelineRows = (
	plan: CompiledTimelineProjectionPlan,
	records: readonly HistoryRecord[],
): readonly Readonly<Record<string, unknown>>[] => {
	if (plan.groupByField === null || plan.start === null) {
		return records.map((record) => toTimelineRow(record));
	}

	const states = new Map<string, Record<string, unknown>>();
	const groupFieldName = plan.groupByField.split(".").at(-1) ?? "group_key";
	for (const record of records) {
		const groupValue = readFieldPath(
			{ payload: record.payload },
			plan.groupByField,
		);
		const groupKey = JSON.stringify(groupValue);
		const state =
			states.get(groupKey) ??
			deepClone(plan.start as Readonly<Record<string, unknown>>);
		const reducers = plan.reducers[record.signalName] ?? [];
		for (const reducer of reducers) {
			applyReducer(state, reducer, record);
		}
		state[groupFieldName] = groupValue;
		states.set(groupKey, state);
	}
	return [...states.values()];
};

/**
 * Executes a deterministic `timeline` projection strategy.
 */
export const executeTimelineProjection = async (
	plan: CompiledTimelineProjectionPlan,
	context: ExecuteProjectionContext,
): Promise<StrategyExecutionResult> => {
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
	const ordered = orderHistoryRecords(deduped.records, plan.orderBy);
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
