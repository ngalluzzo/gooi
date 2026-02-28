/**
 * Canonical boundary contract API.
 */
import * as diagnostics from "./diagnostics";

export type {
	DiagnosticRecord,
	DiagnosticSeverity,
	SpecDiagnostic,
} from "./diagnostics";

export const diagnosticsContracts = Object.freeze({
	diagnosticRecordSchema: diagnostics.diagnosticRecordSchema,
	diagnosticSeveritySchema: diagnostics.diagnosticSeveritySchema,
	specDiagnosticSchema: diagnostics.specDiagnosticSchema,
	parseSpecDiagnostic: diagnostics.parseSpecDiagnostic,
});
