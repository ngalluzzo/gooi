import { reportsContracts } from "@gooi/conformance-contracts/reports";
import { resolutionContracts } from "@gooi/marketplace-contracts/resolution";
import type {
	MarketplaceResolutionConformanceCheckResult,
	MarketplaceResolutionConformanceDiagnostic,
	MarketplaceResolutionConformanceReport,
	RunMarketplaceResolutionConformanceInput,
} from "./contracts";

const buildCheck = (
	id: MarketplaceResolutionConformanceCheckResult["id"],
	passed: boolean,
	detail: string,
): MarketplaceResolutionConformanceCheckResult => ({
	id,
	passed,
	detail,
});

const appendDiagnostic = (
	diagnostics: MarketplaceResolutionConformanceDiagnostic[],
	code: MarketplaceResolutionConformanceDiagnostic["code"],
	path: string,
	message: string,
): void => {
	diagnostics.push({ code, path, message });
};

/**
 * Runs conformance checks for marketplace resolution determinism, explainability,
 * policy/scoring enforcement, and delegated-route metadata behavior.
 */
export const runMarketplaceResolutionConformance = (
	input: RunMarketplaceResolutionConformanceInput,
): MarketplaceResolutionConformanceReport => {
	const diagnostics: MarketplaceResolutionConformanceDiagnostic[] = [];

	const first = resolutionContracts.resolveTrustedProviders(
		input.deterministicInput,
	);
	const second = resolutionContracts.resolveTrustedProviders(
		input.deterministicInput,
	);
	const deterministicPassed =
		first.ok &&
		second.ok &&
		reportsContracts.serializeConformanceReportDeterministically(first) ===
			reportsContracts.serializeConformanceReportDeterministically(second);
	if (!deterministicPassed) {
		appendDiagnostic(
			diagnostics,
			"conformance_determinism_error",
			"resolution.determinism",
			"Resolution output diverged for equivalent deterministic inputs.",
		);
	}

	const summaryResult = resolutionContracts.resolveTrustedProviders({
		...input.explainabilityInput,
		explainabilityMode: "summary",
	});
	const diagnosticsResult = resolutionContracts.resolveTrustedProviders({
		...input.explainabilityInput,
		explainabilityMode: "diagnostics",
	});

	const explainabilityPassed =
		summaryResult.ok &&
		diagnosticsResult.ok &&
		summaryResult.decision.explainability.diagnostics === undefined &&
		diagnosticsResult.decision.explainability.diagnostics !== undefined;
	if (!explainabilityPassed) {
		appendDiagnostic(
			diagnostics,
			"marketplace_resolution_explainability_error",
			"resolution.explainability",
			"Resolution explainability modes failed summary/diagnostics contract behavior.",
		);
	}

	const policyRejected = resolutionContracts.resolveTrustedProviders(
		input.policyRejectedInput,
	);
	const scoringRejected = resolutionContracts.resolveTrustedProviders(
		input.scoringProfileRejectedInput,
	);
	const policyAndScoringPassed =
		!policyRejected.ok &&
		policyRejected.error.code === "resolver_policy_rejection_error" &&
		!scoringRejected.ok &&
		scoringRejected.error.code === "resolver_scoring_profile_error";
	if (!policyAndScoringPassed) {
		appendDiagnostic(
			diagnostics,
			"conformance_parity_error",
			"resolution.policy_scoring",
			"Resolution policy rejection and scoring profile enforcement did not return canonical typed errors.",
		);
	}

	const delegationResult = resolutionContracts.resolveTrustedProviders(
		input.delegatedMetadataGapInput,
	);
	const delegatedReachabilityPassed =
		!delegationResult.ok &&
		delegationResult.error.code === "resolver_delegation_unavailable_error";
	if (!delegatedReachabilityPassed) {
		appendDiagnostic(
			diagnostics,
			"conformance_parity_error",
			"resolution.delegated_reachability",
			"Delegated reachability metadata gap did not trigger typed delegation-contract failure.",
		);
	}

	const checks: MarketplaceResolutionConformanceCheckResult[] = [
		buildCheck(
			"resolution_outputs_deterministic",
			deterministicPassed,
			deterministicPassed
				? "Resolution outputs are deterministic for equivalent fixed inputs."
				: "Resolution outputs are not deterministic for equivalent fixed inputs.",
		),
		buildCheck(
			"resolution_explainability_contract_behavior",
			explainabilityPassed,
			explainabilityPassed
				? "Explainability summary/diagnostics contracts are enforced."
				: "Explainability summary/diagnostics contracts regressed.",
		),
		buildCheck(
			"resolution_policy_and_scoring_contract_behavior",
			policyAndScoringPassed,
			policyAndScoringPassed
				? "Policy and scoring-profile contracts produce typed enforcement errors."
				: "Policy/scoring contract behavior regressed.",
		),
		buildCheck(
			"resolution_delegated_reachability_contract_behavior",
			delegatedReachabilityPassed,
			delegatedReachabilityPassed
				? "Delegated reachability route metadata contracts are enforced."
				: "Delegated reachability route metadata contracts regressed.",
		),
	];

	return {
		passed: checks.every((check) => check.passed),
		checks,
		diagnostics,
	};
};
