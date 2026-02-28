import {
	type DeprecateListingInput,
	type ListingAuditEvent,
	type ListingError,
	type ListingErrorCode,
	type ListingLifecycleStatus,
	type ListingMetadata,
	type ListingMutationResult,
	type ListingRecord,
	type ListingRegistryState,
	type ListingRelease,
	listingContracts,
	type PublishListingInput,
	type UpdateListingInput,
} from "@gooi/marketplace-contracts/listing";

export type MarketplaceListingState = ListingRegistryState;
export type MarketplaceListingMetadata = ListingMetadata;
export type MarketplaceListingRelease = ListingRelease;
export type MarketplaceListingRecord = ListingRecord;
export type MarketplaceListingLifecycleStatus = ListingLifecycleStatus;
export type MarketplaceListingAuditEvent = ListingAuditEvent;
export type MarketplaceListingErrorCode = ListingErrorCode;
export type MarketplaceListingError = ListingError;
export type PublishMarketplaceListingInput = PublishListingInput;
export type UpdateMarketplaceListingInput = UpdateListingInput;
export type DeprecateMarketplaceListingInput = DeprecateListingInput;
export type MarketplaceListingMutationResult = ListingMutationResult;

export const publishMarketplaceListing = listingContracts.publishListing;
export const updateMarketplaceListing = listingContracts.updateListing;
export const deprecateMarketplaceListing = listingContracts.deprecateListing;
