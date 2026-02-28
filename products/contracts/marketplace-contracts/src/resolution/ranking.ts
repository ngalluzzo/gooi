import type { ProviderEligibilityEntry } from "../eligibility/eligibility";

const trustTierRank = {
	blocked: 0,
	unknown: 1,
	review: 2,
	trusted: 3,
} as const;

export interface ResolverScoreComponents {
	readonly trust: number;
	readonly certifications: number;
	readonly semver: number;
	readonly reachability: number;
}

export interface ResolverScore {
	readonly total: number;
	readonly components: ResolverScoreComponents;
}

export interface ResolverScoringWeights {
	readonly trust: number;
	readonly certifications: number;
	readonly semver: number;
	readonly reachability: number;
}

export interface RankedProvider {
	readonly provider: ProviderEligibilityEntry;
	readonly score: ResolverScore;
}

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

const toSemverScore = (value: string): number => {
	const [major, minor, patch] = parseSemver(value);
	return major * 1_000_000 + minor * 1_000 + patch;
};

export const scoreProvider = (
	provider: ProviderEligibilityEntry,
	weights: ResolverScoringWeights,
): ResolverScore => {
	const components: ResolverScoreComponents = {
		trust: trustTierRank[provider.trust.tier] * weights.trust,
		certifications:
			provider.trust.certifications.length * weights.certifications,
		semver: toSemverScore(provider.providerVersion) * weights.semver,
		reachability:
			(provider.reachability.mode === "local" ? 1 : 0) * weights.reachability,
	};
	return {
		components,
		total:
			components.trust +
			components.certifications +
			components.semver +
			components.reachability,
	};
};

export const sortRankedProviders = (
	providers: readonly RankedProvider[],
): RankedProvider[] => {
	return [...providers].sort((left, right) => {
		const totalRank = right.score.total - left.score.total;
		if (totalRank !== 0) {
			return totalRank;
		}
		const semverRank = compareSemverDesc(
			left.provider.providerVersion,
			right.provider.providerVersion,
		);
		if (semverRank !== 0) {
			return semverRank;
		}
		return left.provider.providerId.localeCompare(right.provider.providerId);
	});
};

export const isPolicyRejection = (
	provider: ProviderEligibilityEntry,
): boolean => {
	return provider.reasons.some((reason) => {
		return (
			reason === "trust_tier_below_minimum" ||
			reason === "certification_missing"
		);
	});
};

export const findDelegationMetadataGap = (
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
