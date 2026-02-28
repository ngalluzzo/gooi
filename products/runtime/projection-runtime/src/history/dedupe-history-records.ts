import { errorsContracts } from "@gooi/projection-contracts/errors";
import type { ProjectionSourceRef } from "@gooi/projection-contracts/plans";
import type { HistoryRecord } from "@gooi/projection-contracts/ports";
import { stableStringify } from "@gooi/stable-json";

/**
 * Deduplicates timeline history records by eventKey with conflict detection.
 */
export const dedupeHistoryRecords = (
	records: readonly HistoryRecord[],
	sourceRef: ProjectionSourceRef,
):
	| { readonly ok: true; readonly records: readonly HistoryRecord[] }
	| {
			readonly ok: false;
			readonly error: ReturnType<typeof errorsContracts.createProjectionError>;
	  } => {
	const byEventKey = new Map<string, HistoryRecord>();
	for (const record of records) {
		const existing = byEventKey.get(record.eventKey);
		if (existing === undefined) {
			byEventKey.set(record.eventKey, record);
			continue;
		}
		const existingDigest = stableStringify(existing);
		const incomingDigest = stableStringify(record);
		if (existingDigest !== incomingDigest) {
			return {
				ok: false,
				error: errorsContracts.createProjectionError(
					"projection_history_gap_error",
					"History provider returned conflicting records for the same event key.",
					sourceRef,
					{ eventKey: record.eventKey },
				),
			};
		}
	}
	return {
		ok: true,
		records: [...byEventKey.values()],
	};
};
