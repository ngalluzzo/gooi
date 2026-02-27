import { z } from "zod";

/**
 * Supported diagnostic severities used across spec and authoring diagnostics.
 */
export const diagnosticSeveritySchema = z.enum(["error", "warning", "info"]);

/**
 * Parsed diagnostic severity.
 */
export type DiagnosticSeverity = z.infer<typeof diagnosticSeveritySchema>;

/**
 * Canonical diagnostic record shape shared across lanes.
 */
export const diagnosticRecordSchema = z.object({
	code: z.string().min(1),
	message: z.string().min(1),
	path: z.string().min(1),
});

/**
 * Parsed canonical diagnostic record.
 */
export type DiagnosticRecord = z.infer<typeof diagnosticRecordSchema>;

/**
 * Canonical app-spec diagnostic contract.
 */
export const specDiagnosticSchema = z.object({
	severity: diagnosticSeveritySchema,
	...diagnosticRecordSchema.shape,
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
