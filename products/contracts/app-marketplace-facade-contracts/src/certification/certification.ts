import {
	type CertificationMutationResult,
	type CompleteCertificationInput,
	certificationContracts,
	type RevokeCertificationInput,
	type StartCertificationInput,
} from "@gooi/marketplace-contracts/certification";

export type StartMarketplaceCertificationInput = StartCertificationInput;
export type CompleteMarketplaceCertificationInput = CompleteCertificationInput;
export type RevokeMarketplaceCertificationInput = RevokeCertificationInput;
export type MarketplaceCertificationMutationResult =
	CertificationMutationResult;

export const startMarketplaceCertification =
	certificationContracts.startCertification;
export const completeMarketplaceCertification =
	certificationContracts.completeCertification;
export const revokeMarketplaceCertification =
	certificationContracts.revokeCertification;
