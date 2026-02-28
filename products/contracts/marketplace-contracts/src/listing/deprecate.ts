import { createListingError } from "./errors";
import { deprecateListingInputSchema } from "./model";
import type { ListingMutationResult } from "./result";
import { appendAuditEvent, findListingIndex, replaceListing } from "./state";

export const deprecateListing = (value: unknown): ListingMutationResult => {
	const parsedInput = deprecateListingInputSchema.safeParse(value);
	if (!parsedInput.success) {
		return {
			ok: false,
			error: createListingError(
				"listing_schema_error",
				"Deprecate input failed schema validation.",
				parsedInput.error.issues,
			),
		};
	}

	const { state, actorId, occurredAt, providerId, providerVersion, reason } =
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
	if (existing.status === "deprecated") {
		return { ok: true, state, listing: existing };
	}

	const listing = {
		...existing,
		status: "deprecated" as const,
		deprecatedAt: occurredAt,
		updatedAt: occurredAt,
	};
	const withListing = replaceListing(state, listingIndex, listing);
	const withAudit = appendAuditEvent(withListing, {
		occurredAt,
		actorId,
		action: "deprecate",
		providerNamespace: existing.providerNamespace,
		providerId: existing.providerId,
		providerVersion: existing.providerVersion,
		reason,
	});
	return {
		ok: true,
		state: withAudit.state,
		listing,
		auditEvent: withAudit.event,
	};
};
