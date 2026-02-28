import { z } from "zod";
import { hexHashSchema } from "../shared/hashes";
import { semverSchema } from "../shared/semver";

export const trustSubjectTypeSchema = z.enum([
	"publisher",
	"namespace",
	"release",
]);

export type TrustSubjectType = z.infer<typeof trustSubjectTypeSchema>;

export const trustSubjectSchema = z.object({
	subjectType: trustSubjectTypeSchema,
	subjectId: z.string().min(1),
	providerId: z.string().min(1).optional(),
	providerVersion: semverSchema.optional(),
	namespace: z.string().min(1).optional(),
});

export type TrustSubject = z.infer<typeof trustSubjectSchema>;

export const trustEvaluationModeSchema = z.enum([
	"development",
	"certified",
	"production",
]);

export type TrustEvaluationMode = z.infer<typeof trustEvaluationModeSchema>;

export const artifactSignatureAlgorithmSchema = z.enum([
	"ed25519",
	"rsa-pss-sha256",
]);

export type ArtifactSignatureAlgorithm = z.infer<
	typeof artifactSignatureAlgorithmSchema
>;

export const artifactSignatureSchema = z.object({
	keyId: z.string().min(1),
	algorithm: artifactSignatureAlgorithmSchema,
	signature: z.string().min(1),
	signedArtifactHash: hexHashSchema,
	issuedAt: z.string().datetime({ offset: true }),
});

export type ArtifactSignature = z.infer<typeof artifactSignatureSchema>;

export const provenanceAttestationSchema = z.object({
	attestationId: z.string().min(1),
	builderId: z.string().min(1),
	sourceUri: z.string().min(1),
	subjectArtifactHash: hexHashSchema,
	issuedAt: z.string().datetime({ offset: true }),
	signature: artifactSignatureSchema,
});

export type ProvenanceAttestation = z.infer<typeof provenanceAttestationSchema>;

export const trustPolicyProfileSchema = z.object({
	profileId: z.string().min(1),
	requiredSubjectIds: z.array(z.string().min(1)).default([]),
	requiredBuilderIds: z.array(z.string().min(1)).default([]),
	requireArtifactSignature: z.boolean().default(true),
	requireProvenanceAttestation: z.boolean().default(true),
	failClosedModes: z
		.array(trustEvaluationModeSchema)
		.default(["certified", "production"]),
	requireCertifiedStatusInFailClosedModes: z.boolean().default(true),
});

export type TrustPolicyProfile = z.infer<typeof trustPolicyProfileSchema>;

export const trustCertificationStatusSchema = z.enum([
	"none",
	"pending",
	"certified",
	"rejected",
	"revoked",
]);

export type TrustCertificationStatus = z.infer<
	typeof trustCertificationStatusSchema
>;

export const trustClaimSchema = z.object({
	claimId: z.string().min(1),
	value: z.string().min(1),
	verified: z.boolean(),
});

export type TrustClaim = z.infer<typeof trustClaimSchema>;

export const trustDecisionVerdictSchema = z.enum([
	"trusted",
	"untrusted",
	"revoked",
]);

export type TrustDecisionVerdict = z.infer<typeof trustDecisionVerdictSchema>;

export const trustDecisionReportSchema = z.object({
	subject: trustSubjectSchema,
	profileId: z.string().min(1),
	mode: trustEvaluationModeSchema,
	evaluatedAt: z.string().datetime({ offset: true }),
	verified: z.boolean(),
	verdict: trustDecisionVerdictSchema,
	claims: z.array(trustClaimSchema),
	reasons: z.array(z.string().min(1)),
});

export type TrustDecisionReport = z.infer<typeof trustDecisionReportSchema>;

export const verifyReleaseTrustInputSchema = z.object({
	subject: trustSubjectSchema,
	artifactHash: hexHashSchema,
	signatures: z.array(artifactSignatureSchema).default([]),
	attestations: z.array(provenanceAttestationSchema).default([]),
	certificationStatus: trustCertificationStatusSchema.default("none"),
	revoked: z.boolean().default(false),
	mode: trustEvaluationModeSchema.default("development"),
	policy: trustPolicyProfileSchema,
	evaluatedAt: z.string().datetime({ offset: true }),
});

export type VerifyReleaseTrustInput = z.input<
	typeof verifyReleaseTrustInputSchema
>;
export type VerifyReleaseTrustParsedInput = z.infer<
	typeof verifyReleaseTrustInputSchema
>;
