/**
 * Canonical listing lifecycle contract API.
 */

import * as deprecate from "./deprecate";
import * as errors from "./errors";
import * as model from "./model";
import * as publish from "./publish";
import * as result from "./result";
import * as update from "./update";

export type {
	ListingError,
	ListingErrorCode,
	ListingErrorIssue,
} from "./errors";
export type {
	DeprecateListingInput,
	ListingAuditAction,
	ListingAuditEvent,
	ListingLifecycleStatus,
	ListingMetadata,
	ListingRecord,
	ListingRegistryState,
	ListingRelease,
	PublishListingInput,
	UpdateListingInput,
} from "./model";
export type { ListingMutationResult } from "./result";

export const listingContracts = Object.freeze({
	listingLifecycleStatusSchema: model.listingLifecycleStatusSchema,
	listingMetadataSchema: model.listingMetadataSchema,
	listingReleaseSchema: model.listingReleaseSchema,
	listingRecordSchema: model.listingRecordSchema,
	listingAuditActionSchema: model.listingAuditActionSchema,
	listingAuditEventSchema: model.listingAuditEventSchema,
	listingRegistryStateSchema: model.listingRegistryStateSchema,
	publishListingInputSchema: model.publishListingInputSchema,
	updateListingInputSchema: model.updateListingInputSchema,
	deprecateListingInputSchema: model.deprecateListingInputSchema,
	listingErrorCodeSchema: errors.listingErrorCodeSchema,
	listingErrorIssueSchema: errors.listingErrorIssueSchema,
	listingErrorSchema: errors.listingErrorSchema,
	listingMutationSuccessSchema: result.listingMutationSuccessSchema,
	listingMutationFailureSchema: result.listingMutationFailureSchema,
	listingMutationResultSchema: result.listingMutationResultSchema,
	createListingError: errors.createListingError,
	publishListing: publish.publishListing,
	updateListing: update.updateListing,
	deprecateListing: deprecate.deprecateListing,
});
