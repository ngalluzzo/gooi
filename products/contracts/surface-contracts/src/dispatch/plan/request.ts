import {
	type JsonObject,
	jsonObjectSchema,
} from "@gooi/contract-primitives/json";
import { z } from "zod";

/**
 * Runtime schema for one dispatch request.
 */
export const dispatchRequestSchema = z
	.object({
		surfaceId: z.string().min(1),
		surfaceType: z.string().min(1),
		attributes: jsonObjectSchema,
		payload: jsonObjectSchema.optional(),
	})
	.strict();

type ParsedDispatchRequest = z.infer<typeof dispatchRequestSchema>;

/**
 * One dispatch request payload.
 */
export type DispatchRequest = Omit<ParsedDispatchRequest, "payload"> & {
	readonly payload?: JsonObject | undefined;
};

/**
 * Parses one untrusted dispatch request payload.
 */
export const parseDispatchRequest = (value: unknown): DispatchRequest =>
	dispatchRequestSchema.parse(value);
