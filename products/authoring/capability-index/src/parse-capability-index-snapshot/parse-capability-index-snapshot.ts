import {
	type CapabilityIndexSnapshot,
	capabilityIndexSnapshotSchema,
} from "../capability-index-contracts/capability-index.contracts";
import { sha256, stableStringify } from "@gooi/stable-json";

/**
 * Parses and validates a capability index snapshot.
 *
 * @param value - Untrusted snapshot payload.
 * @returns Parsed snapshot.
 * @throws {Error} When `artifactHash` does not match normalized snapshot content.
 *
 * @example
 * parseCapabilityIndexSnapshot(rawSnapshot);
 */
export const parseCapabilityIndexSnapshot = (
	value: unknown,
): CapabilityIndexSnapshot => {
	const snapshot = capabilityIndexSnapshotSchema.parse(value);
	const { artifactHash, ...content } = snapshot;
	const expectedArtifactHash = sha256(stableStringify(content));

	if (artifactHash !== expectedArtifactHash) {
		throw new Error(
			"Capability index artifactHash does not match normalized snapshot content.",
		);
	}

	return snapshot;
};
