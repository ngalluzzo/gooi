import { z } from "zod";

/**
 * Supported spec diagnostic severities.
 */
export const specDiagnosticSeveritySchema = z.enum([
	"error",
	"warning",
	"info",
]);

/**
 * Canonical app-spec diagnostic contract.
 */
export const specDiagnosticSchema = z.object({
	severity: specDiagnosticSeveritySchema,
	code: z.string().min(1),
	path: z.string().min(1),
	message: z.string().min(1),
	hint: z.string().min(1).optional(),
});

/**
 * Parsed app-spec diagnostic.
 */
export type SpecDiagnostic = z.infer<typeof specDiagnosticSchema>;

/**
 * Parses one diagnostic payload.
 */
export const parseSpecDiagnostic = (value: unknown): SpecDiagnostic =>
	specDiagnosticSchema.parse(value);
