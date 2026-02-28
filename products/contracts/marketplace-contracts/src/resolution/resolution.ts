import type { ProviderEligibilityEntry } from "../eligibility/eligibility";
import { createResolverError } from "../shared/resolver-errors";
import {
	type ResolverSelection,
	type ResolverStage,
	type ResolveTrustedProvidersResult,
	resolveTrustedProvidersInputSchema,
} from "./model";
import {
	findDelegationMetadataGap,
	isPolicyRejection,
	type RankedProvider,
	scoreProvider,
	sortRankedProviders,
} from "./ranking";

const toSelection = (
	ranked: RankedProvider,
	rank: number,
): ResolverSelection => {
	const { provider, score } = ranked;
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
		score,
	};
};

const toTopRejectionReasons = (
	providers: readonly ProviderEligibilityEntry[],
): string[] => {
	const counts = new Map<string, number>();
	for (const provider of providers) {
		for (const reason of provider.reasons) {
			counts.set(reason, (counts.get(reason) ?? 0) + 1);
		}
	}
	return [...counts.entries()]
		.sort(
			(left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
		)
		.map(([reason]) => reason);
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

	const filtered = parsedInput.data.requireEligible
		? providers.filter((provider) => provider.status === "eligible")
		: providers;
	const stages: ResolverStage[] = [
		{
			stage: "filter",
			inputCandidates: providers.length,
			outputCandidates: filtered.length,
			droppedCandidates: providers.length - filtered.length,
			notes: parsedInput.data.requireEligible
				? ["Applied requireEligible candidate filter."]
				: ["Skipped requireEligible candidate filter."],
		},
	];
	if (filtered.length === 0) {
		const code = providers.some((provider) => isPolicyRejection(provider))
			? "resolver_policy_rejection_error"
			: "resolver_no_candidate_error";
		const message =
			code === "resolver_policy_rejection_error"
				? "All providers were rejected by trust or certification policy."
				: "No providers met resolver candidate requirements.";
		return { ok: false, error: createResolverError(code, message) };
	}

	const delegationGap = findDelegationMetadataGap(filtered);
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

	stages.push({
		stage: "eligibility",
		inputCandidates: filtered.length,
		outputCandidates: filtered.length,
		droppedCandidates: 0,
		notes: ["Eligibility outcomes consumed from deterministic report inputs."],
	});

	const ranked = sortRankedProviders(
		filtered.map((provider) => ({ provider, score: scoreProvider(provider) })),
	);
	stages.push({
		stage: "scoring",
		inputCandidates: filtered.length,
		outputCandidates: ranked.length,
		droppedCandidates: 0,
		notes: [
			"Scored candidates using trust, certification, semver, reachability.",
		],
	});

	const selected = ranked.slice(0, parsedInput.data.maxResults);
	const rejected = ranked.slice(parsedInput.data.maxResults);
	stages.push({
		stage: "selection",
		inputCandidates: ranked.length,
		outputCandidates: selected.length,
		droppedCandidates: rejected.length,
		notes: ["Applied deterministic ranked top-N final selection."],
	});

	return {
		ok: true,
		decision: {
			strategy: parsedInput.data.strategy,
			totalCandidates: ranked.length,
			selected: selected.map((provider, index) =>
				toSelection(provider, index + 1),
			),
			rejected: rejected.map((provider, index) =>
				toSelection(provider, selected.length + index + 1),
			),
			stages,
			explainability: {
				policyRejectedCandidates: providers.filter((provider) =>
					isPolicyRejection(provider),
				).length,
				delegatedCandidates: ranked.filter(
					(candidate) => candidate.provider.reachability.mode === "delegated",
				).length,
				localCandidates: ranked.filter(
					(candidate) => candidate.provider.reachability.mode === "local",
				).length,
				topRejectionReasons: toTopRejectionReasons(providers),
			},
		},
	};
};
