/**
 * Canonical provider eligibility contract API.
 */
import * as eligibility from "./eligibility";

export type {
	ProviderEligibilityEntry,
	ProviderEligibilityInput,
	ProviderEligibilityReport,
	ProviderEligibilityResult,
	ProviderEligibilityStatus,
} from "./eligibility";

export const eligibilityContracts = Object.freeze({
	providerEligibilityStatusSchema: eligibility.providerEligibilityStatusSchema,
	providerEligibilityInputSchema: eligibility.providerEligibilityInputSchema,
	providerEligibilityEntrySchema: eligibility.providerEligibilityEntrySchema,
	providerEligibilityReportSchema: eligibility.providerEligibilityReportSchema,
	providerEligibilitySuccessSchema:
		eligibility.providerEligibilitySuccessSchema,
	providerEligibilityFailureSchema:
		eligibility.providerEligibilityFailureSchema,
	providerEligibilityResultSchema: eligibility.providerEligibilityResultSchema,
	explainProviderEligibility: eligibility.explainProviderEligibility,
});
