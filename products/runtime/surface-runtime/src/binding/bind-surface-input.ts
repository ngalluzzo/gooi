import type {
	CompiledEntrypoint,
	CompiledInputField,
	CompiledSurfaceBinding,
} from "@gooi/app-spec-contracts/compiled";
import type { BindingResult } from "@gooi/surface-contracts/binding";
import {
	parseSurfaceRequestPayload,
	type SurfaceRequestPayload,
} from "@gooi/surface-contracts/request";
import { readSourceValue } from "./source-path";

const isoTimestampPattern =
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

const fail = (
	message: string,
	details?: Readonly<Record<string, unknown>>,
): BindingResult<never> => ({
	ok: false,
	error:
		details === undefined
			? { code: "binding_error", message }
			: { code: "binding_error", message, details },
});

const coerceScalarValue = (
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
		case "timestamp":
			return isoTimestampPattern.test(value) ? value : null;
		case "text":
		case "id":
			return value;
	}
};

const resolveFieldValue = (
	request: SurfaceRequestPayload,
	fieldName: string,
	sourcePath: string | undefined,
	field: CompiledInputField,
	defaults: Readonly<Record<string, unknown>>,
): BindingResult<unknown> => {
	const explicit =
		sourcePath === undefined ? undefined : readSourceValue(request, sourcePath);
	if (explicit !== undefined) {
		if (explicit === null) {
			return { ok: true, value: null };
		}
		const coerced = coerceScalarValue(field, explicit);
		if (coerced === null) {
			return fail("Scalar coercion failed for bound field.", {
				fieldName,
				sourcePath,
				scalarType: field.scalarType,
			});
		}
		return { ok: true, value: coerced };
	}

	if (fieldName in defaults) {
		return { ok: true, value: defaults[fieldName] };
	}

	if (field.required) {
		return fail("Required field has no bound value and no default.", {
			fieldName,
			sourcePath,
		});
	}

	return { ok: true, value: undefined };
};

export interface BindSurfaceInputInput {
	readonly request: SurfaceRequestPayload;
	readonly entrypoint: CompiledEntrypoint;
	readonly binding: CompiledSurfaceBinding;
}

/**
 * Binds a surface payload into deterministic entrypoint input values.
 */
export const bindSurfaceInput = (
	input: BindSurfaceInputInput,
): BindingResult<Readonly<Record<string, unknown>>> => {
	const request = parseSurfaceRequestPayload(input.request);

	for (const fieldName of Object.keys(input.binding.fieldBindings)) {
		if (input.entrypoint.inputFields[fieldName] === undefined) {
			return fail("Binding references undeclared entrypoint input field.", {
				fieldName,
				entrypointId: input.entrypoint.id,
			});
		}
	}

	const output: Record<string, unknown> = {};
	for (const [fieldName, field] of Object.entries(
		input.entrypoint.inputFields,
	)) {
		const sourcePath = input.binding.fieldBindings[fieldName];
		const resolved = resolveFieldValue(
			request,
			fieldName,
			sourcePath,
			field,
			input.entrypoint.defaultInput,
		);
		if (!resolved.ok) {
			return resolved;
		}
		if (resolved.value !== undefined) {
			output[fieldName] = resolved.value;
		}
	}

	return { ok: true, value: output };
};
