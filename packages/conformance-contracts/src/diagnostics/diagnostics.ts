import { z } from "zod";

/**
 * Canonical conformance diagnostic record.
 */
export const conformanceDiagnosticRecordSchema = z.object({
	code: z.string().min(1),
	message: z.string().min(1),
	path: z.string().min(1),
});

/**
 * Parsed conformance diagnostic record.
 */
export type ConformanceDiagnosticRecord = z.infer<
	typeof conformanceDiagnosticRecordSchema
>;

/**
 * Parses one conformance diagnostic payload.
 */
export const parseConformanceDiagnosticRecord = (
	value: unknown,
): ConformanceDiagnosticRecord =>
	conformanceDiagnosticRecordSchema.parse(value);
