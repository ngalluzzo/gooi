import {
	type JsonObject,
	jsonObjectSchema,
} from "@gooi/contract-primitives/json";
import { z } from "zod";

/**
 * Stable dispatch error codes.
 */
export const dispatchErrorCodeSchema = z.enum([
	"dispatch_not_found_error",
	"dispatch_ambiguous_error",
	"dispatch_transport_error",
]);

/**
 * Dispatch error code.
 */
export type DispatchErrorCode = z.infer<typeof dispatchErrorCodeSchema>;

/**
 * Runtime schema for one dispatch error payload.
 */
export const dispatchErrorSchema = z
	.object({
		code: dispatchErrorCodeSchema,
		message: z.string().min(1),
		details: jsonObjectSchema.optional(),
	})
	.strict();

/**
 * Dispatch error payload.
 */
export type DispatchError = Omit<
	z.infer<typeof dispatchErrorSchema>,
	"details"
> & {
	readonly details?: JsonObject | undefined;
};

/**
 * Parses one untrusted dispatch error payload.
 */
export const parseDispatchError = (value: unknown): DispatchError =>
	dispatchErrorSchema.parse(value);
