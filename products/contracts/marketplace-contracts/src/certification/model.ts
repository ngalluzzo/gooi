import { z } from "zod";
import { listingRegistryStateSchema } from "../listing/model";
import { hexHashSchema } from "../shared/hashes";
import { semverSchema } from "../shared/semver";
import {
	trustDecisionReportSchema,
	trustDecisionVerdictSchema,
} from "../trust/model";

export const certificationStatusSchema = z.enum([
	"pending",
	"certified",
	"rejected",
	"revoked",
]);

export type CertificationStatus = z.infer<typeof certificationStatusSchema>;

export const certificationEvidenceKindSchema = z.enum([
	"conformance_report",
	"security_scan",
	"provenance_attestation",
]);

export type CertificationEvidenceKind = z.infer<
	typeof certificationEvidenceKindSchema
>;

export const certificationEvidenceSchema = z.object({
	kind: certificationEvidenceKindSchema,
	artifactHash: hexHashSchema,
	artifactUri: z.string().min(1),
	collectedAt: z.string().datetime({ offset: true }),
});

export type CertificationEvidence = z.infer<typeof certificationEvidenceSchema>;

export const certificationFailureCodeSchema = z.enum([
	"missing_required_evidence",
	"policy_check_failed",
	"conformance_failure",
	"security_failure",
]);

export type CertificationFailureCode = z.infer<
	typeof certificationFailureCodeSchema
>;

export const certificationFailureSchema = z.object({
	code: certificationFailureCodeSchema,
	message: z.string().min(1),
});

export type CertificationFailure = z.infer<typeof certificationFailureSchema>;

export const certificationReportSchema = z.object({
	outcome: z.enum(["pass", "fail"]),
	profileId: z.string().min(1),
	failures: z.array(certificationFailureSchema).default([]),
});

export type CertificationReport = z.infer<typeof certificationReportSchema>;

export const certificationRecordSchema = z.object({
	providerId: z.string().min(1),
	providerVersion: semverSchema,
	status: certificationStatusSchema,
	profileId: z.string().min(1),
	evidence: z.array(certificationEvidenceSchema),
	report: certificationReportSchema.optional(),
	trustDecision: trustDecisionReportSchema.optional(),
	updatedAt: z.string().datetime({ offset: true }),
	updatedBy: z.string().min(1),
	transitionCount: z.number().int().positive(),
});

export type CertificationRecord = z.infer<typeof certificationRecordSchema>;

export const certificationAuditActionSchema = z.enum([
	"start",
	"complete",
	"revoke",
]);

export type CertificationAuditAction = z.infer<
	typeof certificationAuditActionSchema
>;

export const certificationAuditEventSchema = z.object({
	sequence: z.number().int().positive(),
	occurredAt: z.string().datetime({ offset: true }),
	actorId: z.string().min(1),
	action: certificationAuditActionSchema,
	providerId: z.string().min(1),
	providerVersion: semverSchema,
	status: certificationStatusSchema,
	reason: z.string().min(1).optional(),
});

export type CertificationAuditEvent = z.infer<
	typeof certificationAuditEventSchema
>;

export const certificationRegistryStateSchema = z.object({
	records: z.array(certificationRecordSchema).default([]),
	auditLog: z.array(certificationAuditEventSchema).default([]),
});

export type CertificationRegistryState = z.infer<
	typeof certificationRegistryStateSchema
>;

export const certificationTrustPolicySchema = z.object({
	required: z.boolean().default(true),
	requiredVerdict: trustDecisionVerdictSchema.default("trusted"),
	requiredClaimIds: z.array(z.string().min(1)).default([]),
});

export type CertificationTrustPolicy = z.infer<
	typeof certificationTrustPolicySchema
>;

export const certificationPolicyProfileSchema = z.object({
	profileId: z.string().min(1),
	requiredEvidenceKinds: z.array(certificationEvidenceKindSchema).default([]),
	trust: certificationTrustPolicySchema.default({
		required: true,
		requiredVerdict: "trusted",
		requiredClaimIds: [],
	}),
});

export type CertificationPolicyProfile = z.infer<
	typeof certificationPolicyProfileSchema
>;

export const startCertificationInputSchema = z.object({
	listingState: listingRegistryStateSchema,
	certificationState: certificationRegistryStateSchema,
	actorId: z.string().min(1),
	occurredAt: z.string().datetime({ offset: true }),
	providerId: z.string().min(1),
	providerVersion: semverSchema,
	profileId: z.string().min(1),
});

export type StartCertificationInput = z.input<
	typeof startCertificationInputSchema
>;

export const completeCertificationInputSchema = z.object({
	listingState: listingRegistryStateSchema,
	certificationState: certificationRegistryStateSchema,
	actorId: z.string().min(1),
	occurredAt: z.string().datetime({ offset: true }),
	providerId: z.string().min(1),
	providerVersion: semverSchema,
	policy: certificationPolicyProfileSchema,
	evidence: z.array(certificationEvidenceSchema).min(1),
	report: certificationReportSchema,
	trustDecision: trustDecisionReportSchema.optional(),
});

export type CompleteCertificationInput = z.input<
	typeof completeCertificationInputSchema
>;

export const revokeCertificationInputSchema = z.object({
	certificationState: certificationRegistryStateSchema,
	actorId: z.string().min(1),
	occurredAt: z.string().datetime({ offset: true }),
	providerId: z.string().min(1),
	providerVersion: semverSchema,
	reason: z.string().min(1),
});

export type RevokeCertificationInput = z.input<
	typeof revokeCertificationInputSchema
>;
