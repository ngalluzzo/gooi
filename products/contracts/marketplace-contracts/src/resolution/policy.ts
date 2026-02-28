import type { ProviderEligibilityEntry } from "../eligibility/eligibility";
import type { ResolverEligibilityDiagnostic } from "./model";
import type { ResolverScoringWeights } from "./ranking";

export const BASELINE_SCORING_PROFILE_ID = "global-1.0.0";

const BASELINE_SCORING_WEIGHTS: ResolverScoringWeights = Object.freeze({
	trust: 100_000_000,
	certifications: 1_000_000,
	semver: 1,
	reachability: 100,
});

const SCORING_WEIGHT_KEYS: readonly (keyof ResolverScoringWeights)[] = [
	"trust",
	"certifications",
	"semver",
	"reachability",
];

const trustTierRank = {
	blocked: 0,
	unknown: 1,
	review: 2,
	trusted: 3,
} as const;

const POLICY_DIAGNOSTIC_CODES = new Set<ResolverEligibilityDiagnostic["code"]>([
	"resolver_eligibility_denylisted",
	"resolver_eligibility_allowlist_miss",
	"resolver_eligibility_trust_below_policy",
	"resolver_eligibility_certification_missing",
	"resolver_eligibility_revoked",
]);

export interface NormalizedResolverPolicy {
	readonly allowProviderIds: readonly string[];
	readonly denyProviderIds: readonly string[];
	readonly requiredCertifications: readonly string[];
	readonly revokedProviderRefs: readonly string[];
	readonly minTrustTier?: ProviderEligibilityEntry["trust"]["tier"];
}

const appendDiagnostic = (
	diagnostics: ResolverEligibilityDiagnostic[],
	provider: ProviderEligibilityEntry,
	code: ResolverEligibilityDiagnostic["code"],
	message: string,
): void => {
	diagnostics.push({
		providerId: provider.providerId,
		providerVersion: provider.providerVersion,
		code,
		message,
	});
};

const isTrustTierAtLeast = (
	actual: ProviderEligibilityEntry["trust"]["tier"],
	minimum: ProviderEligibilityEntry["trust"]["tier"],
): boolean => trustTierRank[actual] >= trustTierRank[minimum];

export const normalizeScoringWeights = (
	weights: Partial<ResolverScoringWeights> | undefined,
): ResolverScoringWeights => ({
	...BASELINE_SCORING_WEIGHTS,
	...(weights ?? {}),
});

export const toScoringProfileIssues = (
	profileId: string | undefined,
	weights: Partial<ResolverScoringWeights> | undefined,
): { path: readonly PropertyKey[]; message: string }[] => {
	const issues: { path: readonly PropertyKey[]; message: string }[] = [];
	if (profileId !== BASELINE_SCORING_PROFILE_ID) {
		issues.push({
			path: ["scoringProfile", "profileId"],
			message: `Unsupported scoring profile '${profileId}'.`,
		});
	}

	const normalizedWeights = normalizeScoringWeights(weights);
	for (const key of SCORING_WEIGHT_KEYS) {
		if (normalizedWeights[key] !== BASELINE_SCORING_WEIGHTS[key]) {
			issues.push({
				path: ["scoringProfile", "weights", key],
				message: `Unsupported weight for '${key}': expected ${BASELINE_SCORING_WEIGHTS[key]}.`,
			});
		}
	}
	return issues;
};

export const normalizeResolverPolicy = (
	policy:
		| {
				allowProviderIds?: readonly string[];
				denyProviderIds?: readonly string[];
				requiredCertifications?: readonly string[];
				revokedProviderRefs?: readonly string[];
				minTrustTier?: ProviderEligibilityEntry["trust"]["tier"] | undefined;
		  }
		| null
		| undefined,
): NormalizedResolverPolicy => ({
	allowProviderIds: policy?.allowProviderIds ?? [],
	denyProviderIds: policy?.denyProviderIds ?? [],
	requiredCertifications: policy?.requiredCertifications ?? [],
	revokedProviderRefs: policy?.revokedProviderRefs ?? [],
	...(policy?.minTrustTier === undefined
		? {}
		: { minTrustTier: policy.minTrustTier }),
});

export const applyFilterStage = (input: {
	readonly providers: readonly ProviderEligibilityEntry[];
	readonly requireEligible: boolean;
	readonly policy: NormalizedResolverPolicy;
	readonly diagnostics: ResolverEligibilityDiagnostic[];
}): { candidates: ProviderEligibilityEntry[]; notes: string[] } => {
	const allowSet = new Set(input.policy.allowProviderIds);
	const denySet = new Set(input.policy.denyProviderIds);
	const revokedSet = new Set(input.policy.revokedProviderRefs);
	const candidates = input.providers.filter((provider) => {
		let rejected = false;
		if (input.requireEligible && provider.status !== "eligible") {
			rejected = true;
			appendDiagnostic(
				input.diagnostics,
				provider,
				"resolver_eligibility_ineligible",
				"Provider is ineligible in the input eligibility report.",
			);
		}
		if (denySet.has(provider.providerId)) {
			rejected = true;
			appendDiagnostic(
				input.diagnostics,
				provider,
				"resolver_eligibility_denylisted",
				"Provider is blocked by denyProviderIds policy.",
			);
		}
		if (allowSet.size > 0 && !allowSet.has(provider.providerId)) {
			rejected = true;
			appendDiagnostic(
				input.diagnostics,
				provider,
				"resolver_eligibility_allowlist_miss",
				"Provider is not included in allowProviderIds policy.",
			);
		}
		const providerRef = `${provider.providerId}@${provider.providerVersion}`;
		if (revokedSet.has(providerRef)) {
			rejected = true;
			appendDiagnostic(
				input.diagnostics,
				provider,
				"resolver_eligibility_revoked",
				"Provider release is revoked by trust revocation policy.",
			);
		}
		return !rejected;
	});

	const notes = [
		input.requireEligible
			? "Applied requireEligible candidate filter."
			: "Skipped requireEligible candidate filter.",
	];
	if (allowSet.size > 0) {
		notes.push(
			`Applied allowProviderIds filter (${input.policy.allowProviderIds.length}).`,
		);
	}
	if (denySet.size > 0) {
		notes.push(
			`Applied denyProviderIds filter (${input.policy.denyProviderIds.length}).`,
		);
	}
	if (revokedSet.size > 0) {
		notes.push(
			`Applied revocation filter (${input.policy.revokedProviderRefs.length}).`,
		);
	}

	return { candidates, notes };
};

export const applyEligibilityStage = (input: {
	readonly providers: readonly ProviderEligibilityEntry[];
	readonly policy: NormalizedResolverPolicy;
	readonly diagnostics: ResolverEligibilityDiagnostic[];
}): { candidates: ProviderEligibilityEntry[]; notes: string[] } => {
	const candidates = input.providers.filter((provider) => {
		let rejected = false;
		if (
			input.policy.minTrustTier !== undefined &&
			!isTrustTierAtLeast(provider.trust.tier, input.policy.minTrustTier)
		) {
			rejected = true;
			appendDiagnostic(
				input.diagnostics,
				provider,
				"resolver_eligibility_trust_below_policy",
				`Provider trust tier '${provider.trust.tier}' is below '${input.policy.minTrustTier}'.`,
			);
		}

		const missingCertifications = input.policy.requiredCertifications.filter(
			(certification) => !provider.trust.certifications.includes(certification),
		);
		if (missingCertifications.length > 0) {
			rejected = true;
			appendDiagnostic(
				input.diagnostics,
				provider,
				"resolver_eligibility_certification_missing",
				`Provider is missing certifications: ${missingCertifications.join(", ")}.`,
			);
		}
		return !rejected;
	});

	const notes = [
		"Eligibility outcomes consumed from deterministic report inputs.",
	];
	if (input.policy.minTrustTier !== undefined) {
		notes.push(`Applied minTrustTier policy (${input.policy.minTrustTier}).`);
	}
	if (input.policy.requiredCertifications.length > 0) {
		notes.push(
			`Applied requiredCertifications policy (${input.policy.requiredCertifications.length}).`,
		);
	}

	return { candidates, notes };
};

export const isPolicyDiagnostic = (
	code: ResolverEligibilityDiagnostic["code"],
): boolean => POLICY_DIAGNOSTIC_CODES.has(code);
