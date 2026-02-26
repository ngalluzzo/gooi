import type { CompiledInputField } from "@gooi/spec-compiler/contracts";

/**
 * Attempts scalar coercion for one bound value.
 *
 * @param field - Compiled field contract.
 * @param value - Bound raw value.
 * @returns Coerced value when successful, or null when coercion fails.
 *
 * @example
 * const value = coerceScalarValue(field, "42");
 */
export const coerceScalarValue = (
	field: CompiledInputField,
	value: unknown,
): unknown | null => {
	if (value === null || value === undefined) {
		return value;
	}
	if (typeof value !== "string") {
		return value;
	}

	switch (field.scalarType) {
		case "int": {
			if (!/^-?\d+$/.test(value)) {
				return null;
			}
			const parsed = Number(value);
			return Number.isInteger(parsed) ? parsed : null;
		}
		case "number": {
			const parsed = Number(value);
			return Number.isFinite(parsed) ? parsed : null;
		}
		case "bool": {
			if (value === "true" || value === "1") {
				return true;
			}
			if (value === "false" || value === "0") {
				return false;
			}
			return null;
		}
		case "timestamp": {
			const parsed = new Date(value);
			if (Number.isNaN(parsed.getTime())) {
				return null;
			}
			return parsed.toISOString();
		}
		case "text":
		case "id":
			return value;
	}
};
