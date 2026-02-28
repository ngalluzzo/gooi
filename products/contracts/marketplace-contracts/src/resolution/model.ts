import { z } from "zod";
import { providerTrustTierSchema } from "../discovery/discovery";
import { providerReachabilitySchema } from "../discovery/reachability";
import { providerEligibilityReportSchema } from "../eligibility/eligibility";
import { resolverErrorSchema } from "../shared/resolver-errors";

export const resolverStrategySchema = z.enum(["trust_then_version"]);

export type ResolverStrategy = z.infer<typeof resolverStrategySchema>;

export const resolveTrustedProvidersInputSchema = z.object({
	report: providerEligibilityReportSchema,
	maxResults: z.number().int().positive().default(1),
	requireEligible: z.boolean().default(true),
	strategy: resolverStrategySchema.default("trust_then_version"),
	scoringProfile: z
		.object({
			profileId: z.string().min(1).default("global-1.0.0"),
			weights: z
				.object({
					trust: z.number().int().positive().default(100_000_000),
					certifications: z.number().int().positive().default(1_000_000),
					semver: z.number().int().positive().default(1),
					reachability: z.number().int().positive().default(100),
				})
				.default({
					trust: 100_000_000,
					certifications: 1_000_000,
					semver: 1,
					reachability: 100,
				}),
		})
		.default({
			profileId: "global-1.0.0",
			weights: {
				trust: 100_000_000,
				certifications: 1_000_000,
				semver: 1,
				reachability: 100,
			},
		}),
	policy: z
		.object({
			allowProviderIds: z.array(z.string().min(1)).default([]),
			denyProviderIds: z.array(z.string().min(1)).default([]),
			requiredCertifications: z.array(z.string().min(1)).default([]),
			minTrustTier: providerTrustTierSchema.optional(),
		})
		.default({
			allowProviderIds: [],
			denyProviderIds: [],
			requiredCertifications: [],
		}),
});

export type ResolveTrustedProvidersInput = z.input<
	typeof resolveTrustedProvidersInputSchema
>;

export const resolverEligibilityDiagnosticCodeSchema = z.enum([
	"resolver_eligibility_ineligible",
	"resolver_eligibility_denylisted",
	"resolver_eligibility_allowlist_miss",
	"resolver_eligibility_trust_below_policy",
	"resolver_eligibility_certification_missing",
]);

export type ResolverEligibilityDiagnosticCode = z.infer<
	typeof resolverEligibilityDiagnosticCodeSchema
>;

export const resolverEligibilityDiagnosticSchema = z.object({
	providerId: z.string().min(1),
	providerVersion: z.string().min(1),
	code: resolverEligibilityDiagnosticCodeSchema,
	message: z.string().min(1),
});

export type ResolverEligibilityDiagnostic = z.infer<
	typeof resolverEligibilityDiagnosticSchema
>;

export const resolverScoreComponentsSchema = z.object({
	trust: z.number().int(),
	certifications: z.number().int(),
	semver: z.number().int(),
	reachability: z.number().int(),
});

export type ResolverScoreComponents = z.infer<
	typeof resolverScoreComponentsSchema
>;

export const resolverScoreSchema = z.object({
	total: z.number().int(),
	components: resolverScoreComponentsSchema,
});

export type ResolverScore = z.infer<typeof resolverScoreSchema>;

export const resolverSelectionSchema = z.object({
	rank: z.number().int().positive(),
	providerId: z.string().min(1),
	providerVersion: z.string().min(1),
	integrity: z.string().min(1),
	reachability: providerReachabilitySchema,
	status: z.enum(["eligible", "ineligible"]),
	reasons: z.array(z.string().min(1)),
	trustTier: providerTrustTierSchema,
	certifications: z.array(z.string().min(1)),
	score: resolverScoreSchema,
});

export type ResolverSelection = z.infer<typeof resolverSelectionSchema>;

export const resolverStageNameSchema = z.enum([
	"filter",
	"eligibility",
	"scoring",
	"selection",
]);

export type ResolverStageName = z.infer<typeof resolverStageNameSchema>;

export const resolverStageSchema = z.object({
	stage: resolverStageNameSchema,
	inputCandidates: z.number().int().nonnegative(),
	outputCandidates: z.number().int().nonnegative(),
	droppedCandidates: z.number().int().nonnegative(),
	notes: z.array(z.string().min(1)).default([]),
});

export type ResolverStage = z.infer<typeof resolverStageSchema>;

export const resolverExplainabilitySchema = z.object({
	policyRejectedCandidates: z.number().int().nonnegative(),
	delegatedCandidates: z.number().int().nonnegative(),
	localCandidates: z.number().int().nonnegative(),
	topRejectionReasons: z.array(z.string().min(1)),
	eligibilityDiagnostics: z.array(resolverEligibilityDiagnosticSchema),
});

export type ResolverExplainability = z.infer<
	typeof resolverExplainabilitySchema
>;

export const resolverDecisionSchema = z.object({
	strategy: resolverStrategySchema,
	totalCandidates: z.number().int().nonnegative(),
	selected: z.array(resolverSelectionSchema),
	rejected: z.array(resolverSelectionSchema),
	stages: z.array(resolverStageSchema),
	explainability: resolverExplainabilitySchema,
});

export type ResolverDecision = z.infer<typeof resolverDecisionSchema>;

export const resolveTrustedProvidersSuccessSchema = z.object({
	ok: z.literal(true),
	decision: resolverDecisionSchema,
});

export const resolveTrustedProvidersFailureSchema = z.object({
	ok: z.literal(false),
	error: resolverErrorSchema,
});

export const resolveTrustedProvidersResultSchema = z.discriminatedUnion("ok", [
	resolveTrustedProvidersSuccessSchema,
	resolveTrustedProvidersFailureSchema,
]);

export type ResolveTrustedProvidersResult = z.infer<
	typeof resolveTrustedProvidersResultSchema
>;
