import {
	type DiagnosticRecord as SharedDiagnosticRecord,
	diagnosticRecordSchema as sharedDiagnosticRecordSchema,
} from "@gooi/app-spec-contracts/diagnostics";

/**
 * Shared base shape for one conformance diagnostic record.
 */
export interface ConformanceDiagnosticRecordBase<TCode extends string = string>
	extends Omit<SharedDiagnosticRecord, "code"> {
	readonly code: TCode;
}

/**
 * Canonical conformance diagnostic record.
 */
export const conformanceDiagnosticRecordSchema = sharedDiagnosticRecordSchema;

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
