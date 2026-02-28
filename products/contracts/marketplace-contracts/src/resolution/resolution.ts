import { createResolverError } from "../shared/resolver-errors";
import {
	countPolicyRejectedCandidates,
	toCandidateScoreDiagnostics,
	toDiagnosticIssues,
	toTopRejectionReasons,
} from "./diagnostics";
import {
	type ResolverEligibilityDiagnostic,
	type ResolverStage,
	type ResolveTrustedProvidersResult,
	resolveTrustedProvidersInputSchema,
} from "./model";
import {
	applyEligibilityStage,
	applyFilterStage,
	BASELINE_SCORING_PROFILE_ID,
	isPolicyDiagnostic,
	normalizeResolverPolicy,
	normalizeScoringWeights,
	toScoringProfileIssues,
} from "./policy";
import {
	findDelegationMetadataGap,
	isPolicyRejection,
	scoreProvider,
	sortRankedProviders,
} from "./ranking";
import { createNoCandidatesError, toSelection } from "./result-helpers";

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

	const scoringProfileIssues = toScoringProfileIssues(
		parsedInput.data.scoringProfile?.profileId,
		parsedInput.data.scoringProfile?.weights,
	);
	if (scoringProfileIssues.length > 0) {
		return {
			ok: false,
			error: createResolverError(
				"resolver_scoring_profile_error",
				`Resolver only supports scoring profile ${BASELINE_SCORING_PROFILE_ID} for baseline 1.0.0.`,
				scoringProfileIssues,
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

	const diagnostics: ResolverEligibilityDiagnostic[] = [];
	if (parsedInput.data.revocation !== undefined) {
		const ageMs =
			Date.parse(parsedInput.data.revocation.evaluatedAt) -
			Date.parse(parsedInput.data.revocation.lastSyncedAt);
		if (ageMs > parsedInput.data.revocation.maxStalenessSeconds * 1_000) {
			return {
				ok: false,
				error: createResolverError(
					"resolver_policy_rejection_error",
					"Revocation state is stale beyond configured freshness guarantees.",
					[
						{
							path: ["revocation", "lastSyncedAt"],
							message: `Revocation state age ${Math.floor(ageMs / 1_000)}s exceeded maxStalenessSeconds=${parsedInput.data.revocation.maxStalenessSeconds}.`,
						},
					],
				),
			};
		}
	}
	const policy = normalizeResolverPolicy({
		...parsedInput.data.policy,
		revokedProviderRefs: parsedInput.data.revocation?.revokedProviderRefs ?? [],
	});
	const filterStage = applyFilterStage({
		providers,
		requireEligible: parsedInput.data.requireEligible,
		policy,
		diagnostics,
	});
	const stages: ResolverStage[] = [
		{
			stage: "filter",
			inputCandidates: providers.length,
			outputCandidates: filterStage.candidates.length,
			droppedCandidates: providers.length - filterStage.candidates.length,
			notes: filterStage.notes,
		},
	];
	if (filterStage.candidates.length === 0) {
		return {
			ok: false,
			error: createNoCandidatesError({ providers, diagnostics }),
		};
	}

	const eligibilityStage = applyEligibilityStage({
		providers: filterStage.candidates,
		policy,
		diagnostics,
	});
	stages.push({
		stage: "eligibility",
		inputCandidates: filterStage.candidates.length,
		outputCandidates: eligibilityStage.candidates.length,
		droppedCandidates:
			filterStage.candidates.length - eligibilityStage.candidates.length,
		notes: eligibilityStage.notes,
	});
	if (eligibilityStage.candidates.length === 0) {
		return {
			ok: false,
			error: createResolverError(
				"resolver_policy_rejection_error",
				"All providers were rejected by trust or certification policy.",
				toDiagnosticIssues(providers, diagnostics),
			),
		};
	}

	const delegationGap = findDelegationMetadataGap(eligibilityStage.candidates);
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

	const scoringWeights = normalizeScoringWeights(
		parsedInput.data.scoringProfile?.weights,
	);
	const ranked = sortRankedProviders(
		eligibilityStage.candidates.map((provider) => ({
			provider,
			score: scoreProvider(provider, scoringWeights),
		})),
	);
	stages.push({
		stage: "scoring",
		inputCandidates: eligibilityStage.candidates.length,
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
				mode: parsedInput.data.explainabilityMode,
				summary: {
					policyRejectedCandidates: countPolicyRejectedCandidates({
						providers,
						diagnostics,
						isPolicyDiagnostic,
						isPolicyRejection,
					}),
					delegatedCandidates: ranked.filter(
						(candidate) => candidate.provider.reachability.mode === "delegated",
					).length,
					localCandidates: ranked.filter(
						(candidate) => candidate.provider.reachability.mode === "local",
					).length,
					topRejectionReasons: toTopRejectionReasons(providers, diagnostics),
				},
				...(parsedInput.data.explainabilityMode === "diagnostics"
					? {
							diagnostics: {
								eligibilityDiagnostics: diagnostics,
								candidateScores: toCandidateScoreDiagnostics(ranked),
							},
						}
					: {}),
			},
		},
	};
};
