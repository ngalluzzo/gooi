/**
 * Canonical boundary contract API.
 */
import * as listing from "./listing";

export type {
	DeprecateMarketplaceListingInput,
	MarketplaceListingAuditEvent,
	MarketplaceListingError,
	MarketplaceListingErrorCode,
	MarketplaceListingLifecycleStatus,
	MarketplaceListingMetadata,
	MarketplaceListingMutationResult,
	MarketplaceListingRecord,
	MarketplaceListingRelease,
	MarketplaceListingState,
	PublishMarketplaceListingInput,
	UpdateMarketplaceListingInput,
} from "./listing";

export const listingContracts = Object.freeze({
	publishMarketplaceListing: listing.publishMarketplaceListing,
	updateMarketplaceListing: listing.updateMarketplaceListing,
	deprecateMarketplaceListing: listing.deprecateMarketplaceListing,
});
