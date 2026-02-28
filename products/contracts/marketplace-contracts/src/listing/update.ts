import { createListingError } from "./errors";
import { updateListingInputSchema } from "./model";
import type { ListingMutationResult } from "./result";
import {
	appendAuditEvent,
	findListingIndex,
	normalizeMetadata,
	replaceListing,
} from "./state";

export const updateListing = (value: unknown): ListingMutationResult => {
	const parsedInput = updateListingInputSchema.safeParse(value);
	if (!parsedInput.success) {
		return {
			ok: false,
			error: createListingError(
				"listing_schema_error",
				"Update input failed schema validation.",
				parsedInput.error.issues,
			),
		};
	}

	const { state, actorId, occurredAt, providerId, providerVersion, metadata } =
		parsedInput.data;
	const listingIndex = findListingIndex(state, providerId, providerVersion);
	if (listingIndex === -1) {
		return {
			ok: false,
			error: createListingError(
				"listing_not_found_error",
				"Listing release was not found.",
			),
		};
	}
	const existing = state.listings[listingIndex];
	if (existing === undefined) {
		return {
			ok: false,
			error: createListingError(
				"listing_not_found_error",
				"Listing release was not found.",
			),
		};
	}
	if (existing.status !== "active") {
		return {
			ok: false,
			error: createListingError(
				"listing_policy_error",
				"Deprecated listing releases cannot be updated.",
			),
		};
	}
	const normalizedMetadata = normalizeMetadata(metadata);
	if (
		JSON.stringify(existing.metadata) === JSON.stringify(normalizedMetadata)
	) {
		return { ok: true, state, listing: existing };
	}

	const listing = {
		...existing,
		metadata: normalizedMetadata,
		updatedAt: occurredAt,
	};
	const withListing = replaceListing(state, listingIndex, listing);
	const withAudit = appendAuditEvent(withListing, {
		occurredAt,
		actorId,
		action: "update",
		providerNamespace: existing.providerNamespace,
		providerId: existing.providerId,
		providerVersion: existing.providerVersion,
	});
	return {
		ok: true,
		state: withAudit.state,
		listing,
		auditEvent: withAudit.event,
	};
};
