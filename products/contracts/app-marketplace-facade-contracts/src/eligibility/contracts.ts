/**
 * Canonical boundary contract API.
 */
import * as eligibility from "./eligibility";

export type {
	ExplainProviderEligibilityEntry,
	ExplainProviderEligibilityInput,
	ExplainProviderEligibilityReport,
	ExplainProviderEligibilityResult,
	ExplainProviderEligibilityStatus,
} from "./eligibility";

export const eligibilityContracts = Object.freeze({
	explainProviderEligibility: eligibility.explainProviderEligibility,
});
