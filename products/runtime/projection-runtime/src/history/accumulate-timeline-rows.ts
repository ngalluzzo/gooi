import type {
	CompiledTimelineProjectionPlan,
	TimelineReducerOperation,
} from "@gooi/projection-contracts/plans/projection-plan";
import type { HistoryRecord } from "@gooi/projection-contracts/ports/history-port-contract";
import { readFieldPath } from "../shared/field-path";

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

/**
 * Applies timeline reducers over ordered history records.
 */
export const accumulateTimelineRows = (
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
