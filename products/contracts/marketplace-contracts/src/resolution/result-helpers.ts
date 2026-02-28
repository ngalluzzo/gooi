import type { ProviderEligibilityEntry } from "../eligibility/eligibility";
import { createResolverError } from "../shared/resolver-errors";
import {
	type ToNoCandidatesErrorInput,
	toDiagnosticIssues,
} from "./diagnostics";
import type { ResolverEligibilityDiagnostic, ResolverSelection } from "./model";
import { isPolicyDiagnostic } from "./policy";
import { isPolicyRejection, type RankedProvider } from "./ranking";

export const toSelection = (
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

export const toNoCandidatesError = ({
	providers,
	diagnostics,
}: ToNoCandidatesErrorInput): {
	code: "resolver_policy_rejection_error" | "resolver_no_candidate_error";
	message: string;
	issues: { path: string[]; message: string }[];
} => {
	const code =
		diagnostics.some((diagnostic: ResolverEligibilityDiagnostic) =>
			isPolicyDiagnostic(diagnostic.code),
		) ||
		providers.some((provider: ProviderEligibilityEntry) =>
			isPolicyRejection(provider),
		)
			? "resolver_policy_rejection_error"
			: "resolver_no_candidate_error";
	const message =
		code === "resolver_policy_rejection_error"
			? "All providers were rejected by trust or certification policy."
			: "No providers met resolver candidate requirements.";

	return {
		code,
		message,
		issues: toDiagnosticIssues(providers, diagnostics).map((issue) => ({
			path: issue.path.map((part) => String(part)),
			message: issue.message,
		})),
	};
};

export const createNoCandidatesError = (input: ToNoCandidatesErrorInput) => {
	const result = toNoCandidatesError(input);
	return createResolverError(result.code, result.message, result.issues);
};
