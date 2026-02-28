import type { ProjectionSortRule } from "@gooi/projection-contracts/plans";
import type { HistoryRecord } from "@gooi/projection-contracts/ports";
import { stableStringify } from "@gooi/stable-json";
import { readFieldPath } from "../shared/field-path";

const toRecord = (
	record: HistoryRecord,
): Readonly<Record<string, unknown>> => ({
	signalName: record.signalName,
	signalVersion: record.signalVersion,
	eventKey: record.eventKey,
	emittedAt: record.emittedAt,
	emitted_at: record.emittedAt,
	traceId: record.traceId,
	trace_id: record.traceId,
	payload: record.payload,
});

const compareUnknown = (left: unknown, right: unknown): number => {
	if (left === right) {
		return 0;
	}
	if (left === undefined || left === null) {
		return 1;
	}
	if (right === undefined || right === null) {
		return -1;
	}
	if (typeof left === "number" && typeof right === "number") {
		return left < right ? -1 : 1;
	}
	if (typeof left === "string" && typeof right === "string") {
		return left.localeCompare(right);
	}
	return stableStringify(left).localeCompare(stableStringify(right));
};

/**
 * Applies deterministic timeline history ordering with canonical tie breakers.
 */
export const orderHistoryRecords = (
	records: readonly HistoryRecord[],
	orderBy: ProjectionSortRule,
): readonly HistoryRecord[] => {
	const enriched = records.map((record, index) => ({
		record,
		index,
		row: toRecord(record),
	}));
	enriched.sort((left, right) => {
		const leftValue = readFieldPath(left.row, orderBy.field);
		const rightValue = readFieldPath(right.row, orderBy.field);
		const compared = compareUnknown(leftValue, rightValue);
		if (compared !== 0) {
			return orderBy.direction === "asc" ? compared : compared * -1;
		}
		const emittedCompared = left.record.emittedAt.localeCompare(
			right.record.emittedAt,
		);
		if (emittedCompared !== 0) {
			return orderBy.direction === "asc"
				? emittedCompared
				: emittedCompared * -1;
		}
		const eventKeyCompared = left.record.eventKey.localeCompare(
			right.record.eventKey,
		);
		if (eventKeyCompared !== 0) {
			return orderBy.direction === "asc"
				? eventKeyCompared
				: eventKeyCompared * -1;
		}
		return left.index - right.index;
	});
	return enriched.map((item) => item.record);
};
