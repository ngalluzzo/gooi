import type { ProjectionFieldSelection } from "@gooi/projection-contracts/plans/projection-plan";

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
	typeof value === "object" && value !== null;

const unsafePathSegments = new Set(["__proto__", "prototype", "constructor"]);

/**
 * Reads one dot-delimited field path from a row-like object.
 */
export const readFieldPath = (
	row: Readonly<Record<string, unknown>>,
	path: string,
): unknown => {
	const parts = path.split(".").filter((part) => part.length > 0);
	if (parts.length === 0) {
		return undefined;
	}

	let cursor: unknown = row;
	for (const part of parts) {
		if (!isRecord(cursor)) {
			return undefined;
		}
		if (unsafePathSegments.has(part) || !Object.hasOwn(cursor, part)) {
			return undefined;
		}
		const next = cursor[part];
		cursor = next;
	}
	return cursor;
};

/**
 * Selects projection output fields from a source row.
 */
export const selectProjectionFields = (
	row: Readonly<Record<string, unknown>>,
	fields: readonly ProjectionFieldSelection[],
): Readonly<Record<string, unknown>> => {
	if (fields.length === 0) {
		return row;
	}
	const selected: Record<string, unknown> = {};
	for (const field of fields) {
		selected[field.as] = readFieldPath(row, field.source);
	}
	return selected;
};
