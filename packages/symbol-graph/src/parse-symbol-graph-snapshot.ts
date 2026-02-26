import {
	type SymbolGraphSnapshot,
	symbolGraphSnapshotSchema,
} from "./contracts";
import { sha256, stableStringify } from "./internal/stable-json";

/**
 * Parses and validates a symbol graph snapshot.
 *
 * @param value - Untrusted snapshot payload.
 * @returns Parsed snapshot.
 * @throws {Error} When `artifactHash` does not match normalized snapshot content.
 *
 * @example
 * parseSymbolGraphSnapshot(rawSnapshot);
 */
export const parseSymbolGraphSnapshot = (
	value: unknown,
): SymbolGraphSnapshot => {
	const snapshot = symbolGraphSnapshotSchema.parse(value);
	const { artifactHash, ...content } = snapshot;
	const expectedArtifactHash = sha256(stableStringify(content));

	if (artifactHash !== expectedArtifactHash) {
		throw new Error(
			"Symbol graph artifactHash does not match normalized snapshot content.",
		);
	}

	return snapshot;
};
