import {
	eligibilityContracts,
	type ProviderEligibilityEntry,
	type ProviderEligibilityInput,
	type ProviderEligibilityReport,
	type ProviderEligibilityResult,
	type ProviderEligibilityStatus,
} from "@gooi/marketplace-contracts/eligibility";

export type ExplainProviderEligibilityInput = ProviderEligibilityInput;
export type ExplainProviderEligibilityStatus = ProviderEligibilityStatus;
export type ExplainProviderEligibilityEntry = ProviderEligibilityEntry;
export type ExplainProviderEligibilityReport = ProviderEligibilityReport;
export type ExplainProviderEligibilityResult = ProviderEligibilityResult;

export const explainProviderEligibility =
	eligibilityContracts.explainProviderEligibility;
