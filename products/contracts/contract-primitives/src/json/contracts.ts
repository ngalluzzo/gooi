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
 * Shared object payload contract used by cross-lane transport surfaces.
 *
 * Runtime parsers enforce JSON-encodable values; the type remains permissive
 * for incremental migration compatibility across packages.
 */
export type JsonObject = Readonly<Record<string, unknown>>;

/**
 * Shared array payload contract used by cross-lane transport surfaces.
 */
export type JsonArray = readonly unknown[];

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

export const json = Object.freeze({
	jsonValueSchema: jsonValueSchema,
	jsonObjectSchema: jsonObjectSchema,
	jsonArraySchema: jsonArraySchema,
	parseJsonValue: parseJsonValue,
	parseJsonObject: parseJsonObject,
});
