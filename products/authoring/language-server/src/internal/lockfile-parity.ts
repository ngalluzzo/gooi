import {
	type AuthoringParityState,
	authoringParityStateSchema,
} from "../contracts/parity";
import type { AuthoringReadContext } from "../contracts/read-context";

const byDiagnosticOrder = (
	left: { path: string; code: string; message: string },
	right: { path: string; code: string; message: string },
): number => {
	if (left.path !== right.path) {
		return left.path.localeCompare(right.path);
	}
	if (left.code !== right.code) {
		return left.code.localeCompare(right.code);
	}
	return left.message.localeCompare(right.message);
};

/**
 * Evaluates lockfile parity for read-path authoring features.
 *
 * @param context - Snapshot-backed read context.
 * @returns Matched or mismatch parity state.
 *
 * @example
 * const parity = evaluateAuthoringReadParity(context);
 */
export const evaluateAuthoringReadParity = (
	context: AuthoringReadContext,
): AuthoringParityState => {
	const issues: AuthoringParityState["issues"] = [];

	if (
		context.lockfile.catalogSnapshot.catalogHash !==
		context.capabilityIndexSnapshot.catalogIdentity.catalogHash
	) {
		issues.push({
			code: "catalog_mismatch_error",
			message:
				"Catalog hash in lockfile does not match capability index snapshot.",
			path: "lockfile.catalogSnapshot.catalogHash",
			staleArtifacts: true,
		});
	}

	if (
		context.lockfile.requiredArtifacts.capabilityIndexSnapshot !==
		context.capabilityIndexSnapshot.artifactHash
	) {
		issues.push({
			code: "artifact_mismatch_error",
			message:
				"Capability index artifact hash in lockfile does not match snapshot.",
			path: "lockfile.requiredArtifacts.capabilityIndexSnapshot",
			staleArtifacts: true,
		});
	}

	if (
		context.lockfile.requiredArtifacts.symbolGraphSnapshot !==
		context.symbolGraphSnapshot.artifactHash
	) {
		issues.push({
			code: "artifact_mismatch_error",
			message:
				"Symbol graph artifact hash in lockfile does not match snapshot.",
			path: "lockfile.requiredArtifacts.symbolGraphSnapshot",
			staleArtifacts: true,
		});
	}

	return authoringParityStateSchema.parse({
		status: issues.length > 0 ? "mismatch" : "matched",
		lockfileHash: context.lockfile.artifactHash,
		issues: [...issues].sort(byDiagnosticOrder),
	});
};
