import {
	type JsonObject,
	type JsonValue,
	jsonObjectSchema,
	jsonValueSchema,
} from "@gooi/contract-primitives/json";
import { z } from "zod";

/**
 * Canonical surface bind-map shape used by authoring and runtime binders.
 */
export const surfaceBindMapSchema = z.record(z.string(), z.string().min(1));

/**
 * Runtime schema for structured surface binding errors.
 */
export const bindingErrorSchema = z.object({
	code: z.literal("binding_error"),
	message: z.string().min(1),
	details: jsonObjectSchema.optional(),
});

/**
 * Structured binding error payload.
 */
export type BindingError = Omit<
	z.infer<typeof bindingErrorSchema>,
	"details"
> & {
	readonly details?: JsonObject | undefined;
};

/**
 * Runtime schema for generic surface binding results.
 */
export const bindingResultSchema = z.union([
	z.object({ ok: z.literal(true), value: jsonValueSchema }),
	z.object({ ok: z.literal(false), error: bindingErrorSchema }),
]);

/**
 * Result type used by surface binding execution.
 */
export type BindingResult<T = JsonValue> =
	| { readonly ok: true; readonly value: T }
	| { readonly ok: false; readonly error: BindingError };

/**
 * Parses one untrusted generic surface binding result.
 */
export const parseBindingResult = (value: unknown): BindingResult<JsonValue> =>
	bindingResultSchema.parse(value);

/**
 * Parses one untrusted surface binding error payload.
 */
export const parseBindingError = (value: unknown): BindingError =>
	bindingErrorSchema.parse(value);
