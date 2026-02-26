import { z } from "zod";

/**
 * Shared envelope version used by surface invocation, signal, and result envelopes.
 */
export const surfaceEnvelopeVersion = "1.0.0" as const;

/**
 * Runtime schema for the shared surface envelope version.
 */
export const surfaceEnvelopeVersionSchema = z.literal(surfaceEnvelopeVersion);

/**
 * Shared envelope version literal.
 */
export type SurfaceEnvelopeVersion = z.infer<
	typeof surfaceEnvelopeVersionSchema
>;

/**
 * Parses one untrusted envelope version payload.
 */
export const parseSurfaceEnvelopeVersion = (
	value: unknown,
): SurfaceEnvelopeVersion => surfaceEnvelopeVersionSchema.parse(value);
