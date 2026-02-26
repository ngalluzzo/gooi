import { createHash } from "node:crypto";

/**
 * Deterministically serializes a JSON-like value with lexical key ordering.
 *
 * @param value - Value to normalize and serialize.
 * @returns Stable JSON string.
 *
 * @example
 * stableStringify({ b: 1, a: 2 }) === '{"a":2,"b":1}'
 */
export const stableStringify = (value: unknown): string =>
	JSON.stringify(normalizeForStableJson(value));

/**
 * Computes a lower-case SHA-256 hex digest.
 *
 * @param value - Input string.
 * @returns SHA-256 digest.
 *
 * @example
 * sha256("gooi")
 */
export const sha256 = (value: string): string =>
	createHash("sha256").update(value, "utf8").digest("hex");

const normalizeForStableJson = (value: unknown): unknown => {
	if (Array.isArray(value)) {
		return value.map(normalizeForStableJson);
	}

	if (value !== null && typeof value === "object") {
		const entries = Object.entries(value).sort(([left], [right]) =>
			left.localeCompare(right),
		);

		return Object.fromEntries(
			entries.map(([key, nestedValue]) => [
				key,
				normalizeForStableJson(nestedValue),
			]),
		);
	}

	return value;
};
