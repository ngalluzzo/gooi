import { z } from "zod";

/**
 * Primitive JSON scalar values.
 */
export type JsonPrimitive = string | number | boolean | null;

/**
 * Recursive JSON value contract used by shared surfaces.
 */
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

/**
 * Recursive JSON object contract used by shared surfaces.
 */
export interface JsonObject {
	readonly [key: string]: JsonValue;
}

/**
 * Recursive JSON array contract used by shared surfaces.
 */
export interface JsonArray extends ReadonlyArray<JsonValue> {}

/**
 * Zod schema for recursive JSON values.
 */
export const jsonValueSchema: z.ZodType<JsonValue> = z.json();

/**
 * Zod schema for recursive JSON objects.
 */
export const jsonObjectSchema: z.ZodType<JsonObject> = z.record(
	z.string(),
	jsonValueSchema,
);

/**
 * Zod schema for recursive JSON arrays.
 */
export const jsonArraySchema: z.ZodType<JsonArray> = z.array(jsonValueSchema);

/**
 * Parses an untrusted JSON value payload.
 */
export const parseJsonValue = (value: unknown): JsonValue =>
	jsonValueSchema.parse(value);

/**
 * Parses an untrusted JSON object payload.
 */
export const parseJsonObject = (value: unknown): JsonObject =>
	jsonObjectSchema.parse(value);
