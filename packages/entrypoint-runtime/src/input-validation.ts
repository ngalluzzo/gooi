import type {
	CompiledEntrypoint,
	CompiledInputField,
	CompiledScalarType,
} from "@gooi/spec-compiler/contracts";
import { z } from "zod";

/**
 * Validation result for entrypoint input payloads.
 */
export type EntrypointInputValidationResult =
	| { readonly ok: true; readonly value: Readonly<Record<string, unknown>> }
	| {
			readonly ok: false;
			readonly details: Readonly<Record<string, unknown>>;
	  };

const scalarSchema = (scalarType: CompiledScalarType): z.ZodType<unknown> => {
	switch (scalarType) {
		case "text":
		case "id":
			return z.string();
		case "int":
			return z.number().int();
		case "number":
			return z.number();
		case "bool":
			return z.boolean();
		case "timestamp":
			return z.string().datetime({ offset: true });
	}
};

const fieldSchema = (field: CompiledInputField): z.ZodType<unknown> => {
	const scalar = scalarSchema(field.scalarType);
	return field.required ? scalar : scalar.optional();
};

const buildEntrypointInputSchema = (
	entrypoint: CompiledEntrypoint,
): z.ZodType<Readonly<Record<string, unknown>>> => {
	const shape: Record<string, z.ZodType<unknown>> = {};
	for (const [fieldName, field] of Object.entries(entrypoint.inputFields)) {
		shape[fieldName] = fieldSchema(field);
	}
	return z.object(shape).strict();
};

/**
 * Validates bound entrypoint input against the compiled scalar contract.
 *
 * @param entrypoint - Compiled entrypoint contract.
 * @param value - Bound input payload.
 * @returns Validation success with parsed value or typed details.
 */
export const validateEntrypointInput = (
	entrypoint: CompiledEntrypoint,
	value: Readonly<Record<string, unknown>>,
): EntrypointInputValidationResult => {
	const parsed = buildEntrypointInputSchema(entrypoint).safeParse(value);
	if (!parsed.success) {
		return {
			ok: false,
			details: {
				issues: parsed.error.issues,
				entrypointId: entrypoint.id,
				entrypointKind: entrypoint.kind,
			},
		};
	}
	return { ok: true, value: parsed.data };
};
