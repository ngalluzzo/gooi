import type { CompiledInputField } from "@gooi/spec-compiler/contracts";
import { coerceScalarValue } from "../internal/coerce-scalar";
import { readSourceValue } from "../internal/read-source-value";
import type {
	BindingResult,
	BindSurfaceInputInput,
	SurfaceRequestPayload,
} from "./contracts";

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

/**
 * Binds a surface payload into deterministic entrypoint input values.
 *
 * @param input - Binding input payload.
 * @returns Bound entrypoint input or a typed binding error.
 *
 * @example
 * const bound = bindSurfaceInput({ request, entrypoint, binding });
 */
export const bindSurfaceInput = (
	input: BindSurfaceInputInput,
): BindingResult<Readonly<Record<string, unknown>>> => {
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
			input.request,
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

export type { BindingResult, BindSurfaceInputInput, SurfaceRequestPayload };
