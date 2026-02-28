import {
	type DeprecateMarketplaceListingInput,
	listingContracts,
	type MarketplaceListingMutationResult,
	type PublishMarketplaceListingInput,
	type UpdateMarketplaceListingInput,
} from "@gooi/app-marketplace-facade-contracts/listing";

export const publishMarketplaceListing = (
	input: PublishMarketplaceListingInput,
): MarketplaceListingMutationResult => {
	return listingContracts.publishMarketplaceListing(input);
};

export const updateMarketplaceListing = (
	input: UpdateMarketplaceListingInput,
): MarketplaceListingMutationResult => {
	return listingContracts.updateMarketplaceListing(input);
};

export const deprecateMarketplaceListing = (
	input: DeprecateMarketplaceListingInput,
): MarketplaceListingMutationResult => {
	return listingContracts.deprecateMarketplaceListing(input);
};
