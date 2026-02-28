import type {
	ListingAuditAction,
	ListingAuditEvent,
	ListingMetadata,
	ListingRecord,
	ListingRegistryState,
	ListingRelease,
} from "./model";

const parseSemver = (value: string): readonly [number, number, number] => {
	const [major, minor, patch] = value.split(".").map((part) => Number(part));
	return [major ?? 0, minor ?? 0, patch ?? 0];
};

const compareSemverDesc = (left: string, right: string): number => {
	const leftSemver = parseSemver(left);
	const rightSemver = parseSemver(right);
	if (leftSemver[0] !== rightSemver[0]) {
		return rightSemver[0] - leftSemver[0];
	}
	if (leftSemver[1] !== rightSemver[1]) {
		return rightSemver[1] - leftSemver[1];
	}
	return rightSemver[2] - leftSemver[2];
};

export const normalizeMetadata = (
	metadata: ListingMetadata,
): ListingMetadata => ({
	...metadata,
	tags: [...new Set(metadata.tags)].sort((left, right) =>
		left.localeCompare(right),
	),
});

export const deriveNamespace = (providerId: string): string =>
	providerId.split(".")[0] ?? providerId;

export const sortListings = (
	listings: readonly ListingRecord[],
): ListingRecord[] => {
	return [...listings].sort((left, right) => {
		const namespaceRank = left.providerNamespace.localeCompare(
			right.providerNamespace,
		);
		if (namespaceRank !== 0) {
			return namespaceRank;
		}
		const providerRank = left.providerId.localeCompare(right.providerId);
		if (providerRank !== 0) {
			return providerRank;
		}
		return compareSemverDesc(left.providerVersion, right.providerVersion);
	});
};

export const findListingIndex = (
	state: ListingRegistryState,
	providerId: string,
	providerVersion: string,
): number =>
	state.listings.findIndex(
		(listing) =>
			listing.providerId === providerId &&
			listing.providerVersion === providerVersion,
	);

export const hasPublishConflict = (
	existing: ListingRecord,
	release: ListingRelease,
): boolean => {
	return (
		existing.contentHash !== release.contentHash ||
		existing.providerNamespace !== release.providerNamespace ||
		existing.integrity !== release.integrity ||
		JSON.stringify(existing.capabilities) !==
			JSON.stringify(release.capabilities)
	);
};

export const appendAuditEvent = (
	state: ListingRegistryState,
	input: {
		occurredAt: string;
		actorId: string;
		action: ListingAuditAction;
		providerNamespace: string;
		providerId: string;
		providerVersion: string;
		reason?: string;
	},
): { state: ListingRegistryState; event: ListingAuditEvent } => {
	const event: ListingAuditEvent = {
		sequence: state.auditLog.length + 1,
		...input,
	};
	return {
		event,
		state: {
			...state,
			auditLog: [...state.auditLog, event],
		},
	};
};

export const replaceListing = (
	state: ListingRegistryState,
	listingIndex: number,
	nextListing: ListingRecord,
): ListingRegistryState => {
	const listings = [...state.listings];
	listings[listingIndex] = nextListing;
	return {
		...state,
		listings: sortListings(listings),
	};
};
