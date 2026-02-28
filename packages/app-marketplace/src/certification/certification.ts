import {
	type CompleteMarketplaceCertificationInput,
	certificationContracts,
	type MarketplaceCertificationMutationResult,
	type RevokeMarketplaceCertificationInput,
	type StartMarketplaceCertificationInput,
} from "@gooi/app-marketplace-facade-contracts/certification";

export const startMarketplaceCertification = (
	input: StartMarketplaceCertificationInput,
): MarketplaceCertificationMutationResult => {
	return certificationContracts.startMarketplaceCertification(input);
};

export const completeMarketplaceCertification = (
	input: CompleteMarketplaceCertificationInput,
): MarketplaceCertificationMutationResult => {
	return certificationContracts.completeMarketplaceCertification(input);
};

export const revokeMarketplaceCertification = (
	input: RevokeMarketplaceCertificationInput,
): MarketplaceCertificationMutationResult => {
	return certificationContracts.revokeMarketplaceCertification(input);
};
