import { z } from "zod";

/**
 * Shared base shape for one conformance diagnostic record.
 */
export interface ConformanceDiagnosticRecordBase<
	TCode extends string = string,
> {
	readonly code: TCode;
	readonly message: string;
	readonly path: string;
}

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
export type ConformanceDiagnosticRecord = ConformanceDiagnosticRecordBase;

/**
 * Parses one conformance diagnostic payload.
 */
export const parseConformanceDiagnosticRecord = (
	value: unknown,
): ConformanceDiagnosticRecord =>
	conformanceDiagnosticRecordSchema.parse(value);
