/**
 * Canonical certification workflow contract API.
 */
import * as complete from "./complete";
import * as errors from "./errors";
import * as model from "./model";
import * as policy from "./policy";
import * as result from "./result";
import * as revoke from "./revoke";
import * as start from "./start";

export type {
	CertificationError,
	CertificationErrorCode,
	CertificationErrorIssue,
} from "./errors";
export type {
	CertificationAuditAction,
	CertificationAuditEvent,
	CertificationEvidence,
	CertificationEvidenceKind,
	CertificationFailure,
	CertificationFailureCode,
	CertificationPolicyProfile,
	CertificationRecord,
	CertificationRegistryState,
	CertificationReport,
	CertificationStatus,
	CompleteCertificationInput,
	RevokeCertificationInput,
	StartCertificationInput,
} from "./model";
export type { CertificationMutationResult } from "./result";

export const certificationContracts = Object.freeze({
	certificationStatusSchema: model.certificationStatusSchema,
	certificationEvidenceKindSchema: model.certificationEvidenceKindSchema,
	certificationEvidenceSchema: model.certificationEvidenceSchema,
	certificationFailureCodeSchema: model.certificationFailureCodeSchema,
	certificationFailureSchema: model.certificationFailureSchema,
	certificationReportSchema: model.certificationReportSchema,
	certificationRecordSchema: model.certificationRecordSchema,
	certificationAuditActionSchema: model.certificationAuditActionSchema,
	certificationAuditEventSchema: model.certificationAuditEventSchema,
	certificationRegistryStateSchema: model.certificationRegistryStateSchema,
	certificationPolicyProfileSchema: model.certificationPolicyProfileSchema,
	startCertificationInputSchema: model.startCertificationInputSchema,
	completeCertificationInputSchema: model.completeCertificationInputSchema,
	revokeCertificationInputSchema: model.revokeCertificationInputSchema,
	certificationErrorCodeSchema: errors.certificationErrorCodeSchema,
	certificationErrorIssueSchema: errors.certificationErrorIssueSchema,
	certificationErrorSchema: errors.certificationErrorSchema,
	certificationMutationSuccessSchema: result.certificationMutationSuccessSchema,
	certificationMutationFailureSchema: result.certificationMutationFailureSchema,
	certificationMutationResultSchema: result.certificationMutationResultSchema,
	createCertificationError: errors.createCertificationError,
	canTransitionCertification: policy.canTransitionCertification,
	sortCertificationEvidence: policy.sortCertificationEvidence,
	missingRequiredEvidenceKinds: policy.missingRequiredEvidenceKinds,
	startCertification: start.startCertification,
	completeCertification: complete.completeCertification,
	revokeCertification: revoke.revokeCertification,
});
