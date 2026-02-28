/**
 * Canonical boundary contract API.
 */
import * as certification from "./certification";

export type {
	CompleteMarketplaceCertificationInput,
	MarketplaceCertificationMutationResult,
	RevokeMarketplaceCertificationInput,
	StartMarketplaceCertificationInput,
} from "./certification";

export const certificationContracts = Object.freeze({
	startMarketplaceCertification: certification.startMarketplaceCertification,
	completeMarketplaceCertification:
		certification.completeMarketplaceCertification,
	revokeMarketplaceCertification: certification.revokeMarketplaceCertification,
});
