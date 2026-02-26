import {
	type BuildCapabilityIndexSnapshotInput,
	type CapabilityIndexEntry,
	type CapabilityIndexSnapshot,
	capabilityIndexSnapshotSchema,
} from "../capability-index-contracts/capability-index.contracts";
import { sha256, stableStringify } from "@gooi/stable-json";

/**
 * Builds a deterministic capability index snapshot from local and catalog capabilities.
 *
 * Collisions on `capabilityId` across local and catalog sources hard-fail.
 *
 * @param input - Snapshot build input.
 * @returns Deterministic capability index snapshot.
 *
 * @example
 * const snapshot = buildCapabilityIndexSnapshot({
 *   sourceHash: "a".repeat(64),
 *   catalogIdentity: {
 *     catalogSource: "demo",
 *     catalogVersion: "2026-02-26",
 *     catalogHash: "b".repeat(64),
 *   },
 *   localCapabilities: [],
 *   catalogCapabilities: [],
 * });
 */
export const buildCapabilityIndexSnapshot = (
	input: BuildCapabilityIndexSnapshotInput,
): CapabilityIndexSnapshot => {
	const capabilities = [
		...input.localCapabilities.map((entry) => ({
			...entry,
			provenance: "local-spec" as const,
		})),
		...input.catalogCapabilities.map((entry) => ({
			...entry,
			provenance: "catalog" as const,
		})),
	].map((entry) => normalizeCapabilityEntry(entry));

	enforceCanonicalCollisions(capabilities);

	const sortedCapabilities = [...capabilities].sort((left, right) => {
		if (left.capabilityId !== right.capabilityId) {
			return left.capabilityId.localeCompare(right.capabilityId);
		}
		if (left.capabilityVersion !== right.capabilityVersion) {
			return left.capabilityVersion.localeCompare(right.capabilityVersion);
		}
		return left.provenance.localeCompare(right.provenance);
	});

	const snapshotContent = {
		artifactVersion: "1.0.0" as const,
		sourceHash: input.sourceHash,
		catalogIdentity: input.catalogIdentity,
		capabilities: sortedCapabilities,
	};

	const artifactHash = sha256(stableStringify(snapshotContent));

	return capabilityIndexSnapshotSchema.parse({
		...snapshotContent,
		artifactHash,
	});
};

const normalizeCapabilityEntry = (
	entry: CapabilityIndexEntry,
): CapabilityIndexEntry => ({
	...entry,
	declaredEffects: [...entry.declaredEffects].sort(),
	providerAvailability: [...entry.providerAvailability].sort((left, right) => {
		if (left.providerId !== right.providerId) {
			return left.providerId.localeCompare(right.providerId);
		}
		return left.providerVersion.localeCompare(right.providerVersion);
	}),
});

const enforceCanonicalCollisions = (
	capabilities: readonly CapabilityIndexEntry[],
): void => {
	const byId = new Map<string, Set<CapabilityIndexEntry["provenance"]>>();

	for (const capability of capabilities) {
		const provenances = byId.get(capability.capabilityId) ?? new Set();
		provenances.add(capability.provenance);
		byId.set(capability.capabilityId, provenances);
	}

	for (const [capabilityId, provenances] of byId.entries()) {
		if (provenances.has("local-spec") && provenances.has("catalog")) {
			throw new Error(
				`Capability id collision detected across local-spec and catalog sources: ${capabilityId}`,
			);
		}
	}
};
