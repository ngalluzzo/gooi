import { z } from "zod";

/**
 * Version identifier for compiled app-spec section outputs.
 */
export const compiledAppSpecVersionSchema = z.literal("1.0.0");

/**
 * Minimal compiled section snapshot scaffold.
 */
export const compiledSectionSnapshotSchema = z.object({
	artifactVersion: compiledAppSpecVersionSchema,
	sections: z.record(z.string(), z.unknown()),
});

/**
 * Parsed compiled section snapshot.
 */
export type CompiledSectionSnapshot = z.infer<
	typeof compiledSectionSnapshotSchema
>;

/**
 * Parses and validates one compiled section snapshot payload.
 */
export const parseCompiledSectionSnapshot = (
	value: unknown,
): CompiledSectionSnapshot => compiledSectionSnapshotSchema.parse(value);
