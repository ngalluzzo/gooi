import type { ConformanceCheckResultBase } from "@gooi/conformance-contracts/checks";
import type { ConformanceDiagnosticRecordBase } from "@gooi/conformance-contracts/diagnostics";
import type { ConformanceSuiteReportBase } from "@gooi/conformance-contracts/reports";
import type { ResolveTrustedProvidersInput } from "@gooi/marketplace-contracts/resolution";

export type MarketplaceResolutionConformanceCheckId =
	| "resolution_outputs_deterministic"
	| "resolution_explainability_contract_behavior"
	| "resolution_policy_and_scoring_contract_behavior"
	| "resolution_delegated_reachability_contract_behavior";

export type MarketplaceResolutionConformanceCheckResult =
	ConformanceCheckResultBase<MarketplaceResolutionConformanceCheckId>;

export interface MarketplaceResolutionConformanceDiagnostic
	extends ConformanceDiagnosticRecordBase<
		| "conformance_determinism_error"
		| "marketplace_resolution_explainability_error"
		| "conformance_parity_error"
	> {}

export interface RunMarketplaceResolutionConformanceInput {
	readonly deterministicInput: ResolveTrustedProvidersInput;
	readonly explainabilityInput: ResolveTrustedProvidersInput;
	readonly policyRejectedInput: ResolveTrustedProvidersInput;
	readonly scoringProfileRejectedInput: ResolveTrustedProvidersInput;
	readonly delegatedMetadataGapInput: ResolveTrustedProvidersInput;
}

export interface MarketplaceResolutionConformanceReport
	extends ConformanceSuiteReportBase<MarketplaceResolutionConformanceCheckResult> {
	readonly diagnostics: readonly MarketplaceResolutionConformanceDiagnostic[];
}
