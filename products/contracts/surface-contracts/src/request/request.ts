import {
	type JsonObject,
	jsonObjectSchema,
} from "@gooi/contract-primitives/json";
import { z } from "zod";

/**
 * Runtime schema for native surface request payload buckets.
 */
export const surfaceRequestPayloadSchema = z
	.object({
		path: jsonObjectSchema.optional(),
		query: jsonObjectSchema.optional(),
		body: jsonObjectSchema.optional(),
		args: jsonObjectSchema.optional(),
		flags: jsonObjectSchema.optional(),
	})
	.strict();

/**
 * Native surface request payload buckets consumed by binding contracts.
 */
export type SurfaceRequestPayload = {
	readonly path?: JsonObject | undefined;
	readonly query?: JsonObject | undefined;
	readonly body?: JsonObject | undefined;
	readonly args?: JsonObject | undefined;
	readonly flags?: JsonObject | undefined;
};

/**
 * Parses one untrusted surface request payload.
 */
export const parseSurfaceRequestPayload = (
	value: unknown,
): SurfaceRequestPayload => surfaceRequestPayloadSchema.parse(value);
