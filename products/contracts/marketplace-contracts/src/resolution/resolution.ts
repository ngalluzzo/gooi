import { z } from "zod";
import { providerTrustTierSchema } from "../discovery/discovery";
import { providerReachabilitySchema } from "../discovery/reachability";
import {
	type ProviderEligibilityEntry,
	providerEligibilityReportSchema,
} from "../eligibility/eligibility";
import {
	createResolverError,
	resolverErrorSchema,
} from "../shared/resolver-errors";

const trustTierRank = {
	blocked: 0,
	unknown: 1,
	review: 2,
	trusted: 3,
} as const;

const parseSemver = (value: string): readonly [number, number, number] => {
	const [major, minor, patch] = value.split(".").map((part) => Number(part));
	return [major ?? 0, minor ?? 0, patch ?? 0];
};

const compareSemverDesc = (left: string, right: string): number => {
	const leftSemver = parseSemver(left);
	const rightSemver = parseSemver(right);
	if (leftSemver[0] !== rightSemver[0]) {
		return rightSemver[0] - leftSemver[0];
	}
	if (leftSemver[1] !== rightSemver[1]) {
		return rightSemver[1] - leftSemver[1];
	}
	return rightSemver[2] - leftSemver[2];
};

const isPolicyRejection = (provider: ProviderEligibilityEntry): boolean => {
	return provider.reasons.some((reason) => {
		return (
			reason === "trust_tier_below_minimum" ||
			reason === "certification_missing"
		);
	});
};

export const resolverStrategySchema = z.enum(["trust_then_version"]);

export type ResolverStrategy = z.infer<typeof resolverStrategySchema>;

export const resolveTrustedProvidersInputSchema = z.object({
	report: providerEligibilityReportSchema,
	maxResults: z.number().int().positive().default(1),
	requireEligible: z.boolean().default(true),
	strategy: resolverStrategySchema.default("trust_then_version"),
});

export type ResolveTrustedProvidersInput = z.input<
	typeof resolveTrustedProvidersInputSchema
>;

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
});

export type ResolverSelection = z.infer<typeof resolverSelectionSchema>;

export const resolverDecisionSchema = z.object({
	strategy: resolverStrategySchema,
	totalCandidates: z.number().int().nonnegative(),
	selected: z.array(resolverSelectionSchema),
	rejected: z.array(resolverSelectionSchema),
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

const toSelection = (
	provider: ProviderEligibilityEntry,
	rank: number,
): ResolverSelection => {
	return {
		rank,
		providerId: provider.providerId,
		providerVersion: provider.providerVersion,
		integrity: provider.integrity,
		reachability: provider.reachability,
		status: provider.status,
		reasons: provider.reasons,
		trustTier: provider.trust.tier,
		certifications: provider.trust.certifications,
	};
};

const findDelegationMetadataGap = (
	providers: readonly ProviderEligibilityEntry[],
): { index: number; provider: ProviderEligibilityEntry } | null => {
	for (const [index, provider] of providers.entries()) {
		if (
			provider.reachability.mode === "delegated" &&
			provider.reachability.delegateRouteId === undefined
		) {
			return { index, provider };
		}
	}
	return null;
};

const sortProviders = (
	providers: readonly ProviderEligibilityEntry[],
): ProviderEligibilityEntry[] => {
	return [...providers].sort((left, right) => {
		const trustRank =
			trustTierRank[right.trust.tier] - trustTierRank[left.trust.tier];
		if (trustRank !== 0) {
			return trustRank;
		}
		const certRank =
			right.trust.certifications.length - left.trust.certifications.length;
		if (certRank !== 0) {
			return certRank;
		}
		const semverRank = compareSemverDesc(
			left.providerVersion,
			right.providerVersion,
		);
		if (semverRank !== 0) {
			return semverRank;
		}
		return left.providerId.localeCompare(right.providerId);
	});
};

export const resolveTrustedProviders = (
	value: unknown,
): ResolveTrustedProvidersResult => {
	const parsedInput = resolveTrustedProvidersInputSchema.safeParse(value);
	if (!parsedInput.success) {
		return {
			ok: false,
			error: createResolverError(
				"resolver_request_schema_error",
				"Resolution input failed schema validation.",
				parsedInput.error.issues,
			),
		};
	}

	const providers = parsedInput.data.report.providers;
	if (providers.length === 0) {
		return {
			ok: false,
			error: createResolverError(
				"resolver_no_candidate_error",
				"No providers were available in the eligibility report.",
			),
		};
	}

	const candidates = parsedInput.data.requireEligible
		? providers.filter((provider) => provider.status === "eligible")
		: providers;

	if (candidates.length === 0) {
		const code = providers.some((provider) => isPolicyRejection(provider))
			? "resolver_policy_rejection_error"
			: "resolver_no_candidate_error";
		const message =
			code === "resolver_policy_rejection_error"
				? "All providers were rejected by trust or certification policy."
				: "No providers met resolver candidate requirements.";
		return {
			ok: false,
			error: createResolverError(code, message),
		};
	}

	const delegationGap = findDelegationMetadataGap(candidates);
	if (delegationGap !== null) {
		return {
			ok: false,
			error: createResolverError(
				"resolver_delegation_unavailable_error",
				"Delegated provider candidate is missing delegation route metadata.",
				[
					{
						path: [
							"report",
							"providers",
							delegationGap.index,
							"reachability",
							"delegateRouteId",
						],
						message: `Missing delegateRouteId for delegated provider ${delegationGap.provider.providerId}@${delegationGap.provider.providerVersion}.`,
					},
				],
			),
		};
	}

	const sortedCandidates = sortProviders(candidates);
	const selected = sortedCandidates.slice(0, parsedInput.data.maxResults);
	const rejected = sortedCandidates.slice(parsedInput.data.maxResults);

	return {
		ok: true,
		decision: {
			strategy: parsedInput.data.strategy,
			totalCandidates: sortedCandidates.length,
			selected: selected.map((provider, index) =>
				toSelection(provider, index + 1),
			),
			rejected: rejected.map((provider, index) => {
				return toSelection(provider, selected.length + index + 1);
			}),
		},
	};
};
