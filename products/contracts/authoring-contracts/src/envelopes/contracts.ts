/**
 * Canonical boundary contract API.
 */
import * as authoring_diagnostics_envelope from "./authoring-diagnostics-envelope";
import * as authoring_error_envelope from "./authoring-error-envelope";
import * as authoring_request_envelope from "./authoring-request-envelope";
import * as authoring_result_envelope from "./authoring-result-envelope";
import * as shared from "./shared";

export type {
	AuthoringDiagnosticSeverity,
	AuthoringDiagnosticsEnvelope,
} from "./authoring-diagnostics-envelope";
export type {
	AuthoringErrorCode,
	AuthoringErrorEnvelope,
} from "./authoring-error-envelope";
export type {
	AuthoringOperation,
	AuthoringRequestEnvelope,
} from "./authoring-request-envelope";
export type { AuthoringResultEnvelope } from "./authoring-result-envelope";
export type { AuthoringEnvelopeVersion } from "./shared";

export const envelopesContracts = Object.freeze({
	authoringDiagnosticSeveritySchema:
		authoring_diagnostics_envelope.authoringDiagnosticSeveritySchema,
	authoringDiagnosticSchema:
		authoring_diagnostics_envelope.authoringDiagnosticSchema,
	authoringDiagnosticsEnvelopeSchema:
		authoring_diagnostics_envelope.authoringDiagnosticsEnvelopeSchema,
	parseAuthoringDiagnosticsEnvelope:
		authoring_diagnostics_envelope.parseAuthoringDiagnosticsEnvelope,
	authoringErrorCodeSchema: authoring_error_envelope.authoringErrorCodeSchema,
	authoringErrorEnvelopeSchema:
		authoring_error_envelope.authoringErrorEnvelopeSchema,
	parseAuthoringErrorEnvelope:
		authoring_error_envelope.parseAuthoringErrorEnvelope,
	authoringOperationSchema: authoring_request_envelope.authoringOperationSchema,
	authoringRequestEnvelopeSchema:
		authoring_request_envelope.authoringRequestEnvelopeSchema,
	parseAuthoringRequestEnvelope:
		authoring_request_envelope.parseAuthoringRequestEnvelope,
	authoringResultEnvelopeSchema:
		authoring_result_envelope.authoringResultEnvelopeSchema,
	parseAuthoringResultEnvelope:
		authoring_result_envelope.parseAuthoringResultEnvelope,
	authoringEnvelopeVersionSchema: shared.authoringEnvelopeVersionSchema,
	authoringRequestIdSchema: shared.authoringRequestIdSchema,
	authoringTimestampSchema: shared.authoringTimestampSchema,
	parseAuthoringRequestId: shared.parseAuthoringRequestId,
});
