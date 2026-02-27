import type { ProjectionSortRule } from "@gooi/projection-contracts/plans/projection-plan";
import { stableStringify } from "@gooi/stable-json";
import { readFieldPath } from "./field-path";

const compareScalar = (left: unknown, right: unknown): number => {
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
	if (typeof left === "boolean" && typeof right === "boolean") {
		return Number(left) - Number(right);
	}
	if (typeof left === "string" && typeof right === "string") {
		return left.localeCompare(right);
	}
	return stableStringify(left).localeCompare(stableStringify(right));
};

/**
 * Sorts rows deterministically using declared rules with stable tie breaking.
 */
export const sortRowsDeterministically = (
	rows: readonly Readonly<Record<string, unknown>>[],
	rules: readonly ProjectionSortRule[],
): readonly Readonly<Record<string, unknown>>[] => {
	const enriched = rows.map((row, index) => ({ row, index }));
	enriched.sort((left, right) => {
		for (const rule of rules) {
			const leftValue = readFieldPath(left.row, rule.field);
			const rightValue = readFieldPath(right.row, rule.field);
			const compared = compareScalar(leftValue, rightValue);
			if (compared !== 0) {
				return rule.direction === "asc" ? compared : compared * -1;
			}
		}
		const tieBreak = stableStringify(left.row).localeCompare(
			stableStringify(right.row),
		);
		if (tieBreak !== 0) {
			return tieBreak;
		}
		return left.index - right.index;
	});
	return enriched.map((item) => item.row);
};
