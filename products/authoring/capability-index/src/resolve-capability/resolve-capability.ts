import type {
	CapabilityIndexEntry,
	CapabilityIndexSnapshot,
} from "../capability-index-contracts/capability-index.contracts";

/**
 * Capability query used to resolve one capability entry.
 */
export interface ResolveCapabilityQuery {
	/** Canonical capability id. */
	readonly capabilityId: string;
	/** Optional exact version. */
	readonly capabilityVersion?: string;
}

/**
 * Resolves one capability entry from a parsed capability index snapshot.
 *
 * @param snapshot - Parsed capability index snapshot.
 * @param query - Capability lookup query.
 * @returns Matching capability entry, or `undefined` when not found.
 * @throws {Error} When query is ambiguous and no version is provided.
 *
 * @example
 * resolveCapability(snapshot, { capabilityId: "message.is_allowed" });
 */
export const resolveCapability = (
	snapshot: CapabilityIndexSnapshot,
	query: ResolveCapabilityQuery,
): CapabilityIndexEntry | undefined => {
	const matches = snapshot.capabilities.filter(
		(capability) => capability.capabilityId === query.capabilityId,
	);

	if (matches.length === 0) {
		return undefined;
	}

	if (query.capabilityVersion === undefined) {
		if (matches.length > 1) {
			throw new Error(
				`Capability lookup is ambiguous without version: ${query.capabilityId}`,
			);
		}
		return matches[0];
	}

	return matches.find(
		(capability) => capability.capabilityVersion === query.capabilityVersion,
	);
};
