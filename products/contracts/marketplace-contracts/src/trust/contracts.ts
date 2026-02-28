/**
 * Canonical trust verification contract API.
 */
import * as errors from "./errors";
import * as model from "./model";
import * as result from "./result";
import * as verification from "./verification";

export type { TrustError, TrustErrorCode, TrustErrorIssue } from "./errors";
export type {
	ArtifactSignature,
	ArtifactSignatureAlgorithm,
	ProvenanceAttestation,
	TrustCertificationStatus,
	TrustClaim,
	TrustDecisionReport,
	TrustDecisionVerdict,
	TrustEvaluationMode,
	TrustPolicyProfile,
	TrustSubject,
	TrustSubjectType,
	VerifyReleaseTrustInput,
} from "./model";
export type { VerifyReleaseTrustResult } from "./result";

export const trustContracts = Object.freeze({
	trustSubjectTypeSchema: model.trustSubjectTypeSchema,
	trustSubjectSchema: model.trustSubjectSchema,
	trustEvaluationModeSchema: model.trustEvaluationModeSchema,
	artifactSignatureAlgorithmSchema: model.artifactSignatureAlgorithmSchema,
	artifactSignatureSchema: model.artifactSignatureSchema,
	provenanceAttestationSchema: model.provenanceAttestationSchema,
	trustPolicyProfileSchema: model.trustPolicyProfileSchema,
	trustCertificationStatusSchema: model.trustCertificationStatusSchema,
	trustClaimSchema: model.trustClaimSchema,
	trustDecisionVerdictSchema: model.trustDecisionVerdictSchema,
	trustDecisionReportSchema: model.trustDecisionReportSchema,
	verifyReleaseTrustInputSchema: model.verifyReleaseTrustInputSchema,
	trustErrorCodeSchema: errors.trustErrorCodeSchema,
	trustErrorIssueSchema: errors.trustErrorIssueSchema,
	trustErrorSchema: errors.trustErrorSchema,
	verifyReleaseTrustSuccessSchema: result.verifyReleaseTrustSuccessSchema,
	verifyReleaseTrustFailureSchema: result.verifyReleaseTrustFailureSchema,
	verifyReleaseTrustResultSchema: result.verifyReleaseTrustResultSchema,
	createTrustError: errors.createTrustError,
	verifyReleaseTrust: verification.verifyReleaseTrust,
});
