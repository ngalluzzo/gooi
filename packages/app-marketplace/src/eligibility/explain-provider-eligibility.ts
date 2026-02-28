import {
	type ExplainProviderEligibilityInput,
	type ExplainProviderEligibilityResult,
	eligibilityContracts,
} from "@gooi/app-marketplace-facade-contracts/eligibility";

export const explainProviderEligibility = (
	input: ExplainProviderEligibilityInput,
): ExplainProviderEligibilityResult => {
	return eligibilityContracts.explainProviderEligibility(input);
};
