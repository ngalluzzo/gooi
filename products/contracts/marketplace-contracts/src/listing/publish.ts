import { createListingError } from "./errors";
import { publishListingInputSchema } from "./model";
import type { ListingMutationResult } from "./result";
import {
	appendAuditEvent,
	deriveNamespace,
	findListingIndex,
	hasPublishConflict,
	normalizeMetadata,
	sortListings,
} from "./state";

export const publishListing = (value: unknown): ListingMutationResult => {
	const parsedInput = publishListingInputSchema.safeParse(value);
	if (!parsedInput.success) {
		return {
			ok: false,
			error: createListingError(
				"listing_schema_error",
				"Publish input failed schema validation.",
				parsedInput.error.issues,
			),
		};
	}

	const { state, actorId, occurredAt, namespaceApprovals, release } =
		parsedInput.data;
	if (release.providerNamespace !== deriveNamespace(release.providerId)) {
		return {
			ok: false,
			error: createListingError(
				"listing_policy_error",
				"Provider namespace must match provider id namespace prefix.",
			),
		};
	}

	const listingIndex = findListingIndex(
		state,
		release.providerId,
		release.providerVersion,
	);
	if (listingIndex !== -1) {
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
		if (hasPublishConflict(existing, release)) {
			return {
				ok: false,
				error: createListingError(
					"listing_conflict_error",
					"Provider release already exists with different immutable data.",
				),
			};
		}
		return { ok: true, state, listing: existing };
	}

	const isInitialOnboarding =
		release.providerVersion === "1.0.0" &&
		!state.listings.some(
			(listing) => listing.providerId === release.providerId,
		);
	if (
		isInitialOnboarding &&
		!namespaceApprovals.includes(release.providerNamespace)
	) {
		return {
			ok: false,
			error: createListingError(
				"listing_policy_error",
				"Namespace approval is required for initial 1.0.0 onboarding publish.",
			),
		};
	}

	const listing = {
		...release,
		metadata: normalizeMetadata(release.metadata),
		status: "active" as const,
		publishedAt: occurredAt,
		updatedAt: occurredAt,
	};
	const withAudit = appendAuditEvent(state, {
		occurredAt,
		actorId,
		action: "publish",
		providerNamespace: release.providerNamespace,
		providerId: release.providerId,
		providerVersion: release.providerVersion,
	});
	return {
		ok: true,
		state: {
			...withAudit.state,
			listings: sortListings([...withAudit.state.listings, listing]),
		},
		listing,
		auditEvent: withAudit.event,
	};
};
