import { z } from "zod";

import { authoringReadContextSchema } from "./read-context";

/**
 * Diagnostics request contract for authoring read-path diagnostics generation.
 */
export const authoringDiagnosticsRequestSchema = z.object({
	context: authoringReadContextSchema,
	generatedAt: z.string().datetime().optional(),
});

/**
 * Parsed diagnostics request.
 */
export type AuthoringDiagnosticsRequest = z.infer<
	typeof authoringDiagnosticsRequestSchema
>;
