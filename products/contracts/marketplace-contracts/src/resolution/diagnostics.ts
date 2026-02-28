import type { ProviderEligibilityEntry } from "../eligibility/eligibility";
import type { ResolverEligibilityDiagnostic } from "./model";

export const toProviderRef = (provider: {
	providerId: string;
	providerVersion: string;
}): string => `${provider.providerId}@${provider.providerVersion}`;

export const toDiagnosticIssues = (
	providers: readonly ProviderEligibilityEntry[],
	diagnostics: readonly ResolverEligibilityDiagnostic[],
): { path: readonly PropertyKey[]; message: string }[] => {
	const indexes = new Map<string, number>();
	providers.forEach((provider, index) => {
		indexes.set(toProviderRef(provider), index);
	});

	return diagnostics.map((diagnostic) => {
		const providerRef = toProviderRef(diagnostic);
		const index = indexes.get(providerRef) ?? -1;
		return {
			path: ["report", "providers", index],
			message: `${diagnostic.code}: ${diagnostic.message}`,
		};
	});
};

export const toTopRejectionReasons = (
	providers: readonly ProviderEligibilityEntry[],
	diagnostics: readonly ResolverEligibilityDiagnostic[],
): string[] => {
	const counts = new Map<string, number>();
	for (const provider of providers) {
		for (const reason of provider.reasons) {
			counts.set(reason, (counts.get(reason) ?? 0) + 1);
		}
	}
	for (const diagnostic of diagnostics) {
		counts.set(diagnostic.code, (counts.get(diagnostic.code) ?? 0) + 1);
	}

	return [...counts.entries()]
		.sort(
			(left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
		)
		.map(([reason]) => reason);
};

export const countPolicyRejectedCandidates = (input: {
	readonly providers: readonly ProviderEligibilityEntry[];
	readonly diagnostics: readonly ResolverEligibilityDiagnostic[];
	readonly isPolicyDiagnostic: (
		code: ResolverEligibilityDiagnostic["code"],
	) => boolean;
	readonly isPolicyRejection: (provider: ProviderEligibilityEntry) => boolean;
}): number => {
	const providerRefs = new Set([
		...input.providers
			.filter((provider) => input.isPolicyRejection(provider))
			.map((provider) => toProviderRef(provider)),
		...input.diagnostics
			.filter((diagnostic) => input.isPolicyDiagnostic(diagnostic.code))
			.map((diagnostic) => toProviderRef(diagnostic)),
	]);
	return providerRefs.size;
};
