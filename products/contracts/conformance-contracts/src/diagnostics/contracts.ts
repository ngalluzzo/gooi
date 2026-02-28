/**
 * Canonical boundary contract API.
 */
import * as diagnostics from "./diagnostics";

export type {
	ConformanceDiagnosticRecord,
	ConformanceDiagnosticRecordBase,
} from "./diagnostics";

export const diagnosticsContracts = Object.freeze({
	conformanceDiagnosticRecordSchema:
		diagnostics.conformanceDiagnosticRecordSchema,
	parseConformanceDiagnosticRecord:
		diagnostics.parseConformanceDiagnosticRecord,
});
