/**
 * Canonical trust verification contract API.
 */
import * as errors from "./errors";
import * as model from "./model";
import * as result from "./result";
import * as revocation from "./revocation";
import * as revocationModel from "./revocation-model";
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
export type {
	PublishTrustRevocationInput,
	PublishTrustRevocationResult,
	PullTrustRevocationFeedInput,
	PullTrustRevocationFeedResult,
	ResolverRevocationState,
	TrustRevocationAction,
	TrustRevocationEvent,
	TrustRevocationLedger,
} from "./revocation-model";

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
	trustRevocationActionSchema: revocationModel.trustRevocationActionSchema,
	trustRevocationEventSchema: revocationModel.trustRevocationEventSchema,
	trustRevocationLedgerSchema: revocationModel.trustRevocationLedgerSchema,
	publishTrustRevocationInputSchema:
		revocationModel.publishTrustRevocationInputSchema,
	publishTrustRevocationSuccessSchema:
		revocationModel.publishTrustRevocationSuccessSchema,
	publishTrustRevocationFailureSchema:
		revocationModel.publishTrustRevocationFailureSchema,
	publishTrustRevocationResultSchema:
		revocationModel.publishTrustRevocationResultSchema,
	pullTrustRevocationFeedInputSchema:
		revocationModel.pullTrustRevocationFeedInputSchema,
	pullTrustRevocationFeedResultSchema:
		revocationModel.pullTrustRevocationFeedResultSchema,
	resolverRevocationStateSchema: revocationModel.resolverRevocationStateSchema,
	trustErrorCodeSchema: errors.trustErrorCodeSchema,
	trustErrorIssueSchema: errors.trustErrorIssueSchema,
	trustErrorSchema: errors.trustErrorSchema,
	verifyReleaseTrustSuccessSchema: result.verifyReleaseTrustSuccessSchema,
	verifyReleaseTrustFailureSchema: result.verifyReleaseTrustFailureSchema,
	verifyReleaseTrustResultSchema: result.verifyReleaseTrustResultSchema,
	createTrustError: errors.createTrustError,
	verifyReleaseTrust: verification.verifyReleaseTrust,
	publishTrustRevocation: revocation.publishTrustRevocation,
	pullTrustRevocationFeed: revocation.pullTrustRevocationFeed,
	deriveRevokedProviderRefs: revocation.deriveRevokedProviderRefs,
});
