import { lockfileContracts } from "@gooi/authoring-contracts/lockfile";
import {
	type AuthoringParityState,
	authoringParityStateSchema,
} from "../contracts/parity";
import type { AuthoringReadContext } from "../contracts/read-context";

const { authoringRequiredArtifactIds } = lockfileContracts;

const byDiagnosticOrder = (
	left: AuthoringParityState["issues"][number],
	right: AuthoringParityState["issues"][number],
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
	const addMismatch = (input: {
		readonly code: "artifact_mismatch_error" | "catalog_mismatch_error";
		readonly path: string;
		readonly message: string;
		readonly expected: string;
		readonly actual: string;
	}) => {
		if (input.expected === input.actual) {
			return;
		}
		issues.push({
			code: input.code,
			message: `${input.message} expected=${input.expected} actual=${input.actual}`,
			path: input.path,
			staleArtifacts: true,
		});
	};

	addMismatch({
		code: "catalog_mismatch_error",
		message:
			"Catalog source in lockfile does not match capability index snapshot.",
		path: "lockfile.catalogSnapshot.catalogSource",
		expected: context.capabilityIndexSnapshot.catalogIdentity.catalogSource,
		actual: context.lockfile.catalogSnapshot.catalogSource,
	});

	addMismatch({
		code: "catalog_mismatch_error",
		message:
			"Catalog version in lockfile does not match capability index snapshot.",
		path: "lockfile.catalogSnapshot.catalogVersion",
		expected: context.capabilityIndexSnapshot.catalogIdentity.catalogVersion,
		actual: context.lockfile.catalogSnapshot.catalogVersion,
	});

	addMismatch({
		code: "catalog_mismatch_error",
		message:
			"Catalog hash in lockfile does not match capability index snapshot.",
		path: "lockfile.catalogSnapshot.catalogHash",
		expected: context.capabilityIndexSnapshot.catalogIdentity.catalogHash,
		actual: context.lockfile.catalogSnapshot.catalogHash,
	});

	addMismatch({
		code: "artifact_mismatch_error",
		message:
			"Compiled entrypoint bundle artifact id in lockfile does not match context identity.",
		path: "lockfile.requiredArtifacts.compiledEntrypointBundle.artifactId",
		expected: context.compiledEntrypointBundleIdentity.artifactId,
		actual:
			context.lockfile.requiredArtifacts.compiledEntrypointBundle.artifactId,
	});
	addMismatch({
		code: "artifact_mismatch_error",
		message:
			"Compiled entrypoint bundle artifact version in lockfile does not match context identity.",
		path: "lockfile.requiredArtifacts.compiledEntrypointBundle.artifactVersion",
		expected: context.compiledEntrypointBundleIdentity.artifactVersion,
		actual:
			context.lockfile.requiredArtifacts.compiledEntrypointBundle
				.artifactVersion,
	});
	addMismatch({
		code: "artifact_mismatch_error",
		message:
			"Compiled entrypoint bundle artifact hash in lockfile does not match context identity.",
		path: "lockfile.requiredArtifacts.compiledEntrypointBundle.artifactHash",
		expected: context.compiledEntrypointBundleIdentity.artifactHash,
		actual:
			context.lockfile.requiredArtifacts.compiledEntrypointBundle.artifactHash,
	});

	addMismatch({
		code: "artifact_mismatch_error",
		message:
			"Capability index artifact id in lockfile does not match expected identity.",
		path: "lockfile.requiredArtifacts.capabilityIndexSnapshot.artifactId",
		expected: authoringRequiredArtifactIds.capabilityIndexSnapshot,
		actual:
			context.lockfile.requiredArtifacts.capabilityIndexSnapshot.artifactId,
	});
	addMismatch({
		code: "artifact_mismatch_error",
		message:
			"Capability index artifact version in lockfile does not match snapshot.",
		path: "lockfile.requiredArtifacts.capabilityIndexSnapshot.artifactVersion",
		expected: context.capabilityIndexSnapshot.artifactVersion,
		actual:
			context.lockfile.requiredArtifacts.capabilityIndexSnapshot
				.artifactVersion,
	});
	addMismatch({
		code: "artifact_mismatch_error",
		message:
			"Capability index artifact hash in lockfile does not match snapshot.",
		path: "lockfile.requiredArtifacts.capabilityIndexSnapshot.artifactHash",
		expected: context.capabilityIndexSnapshot.artifactHash,
		actual:
			context.lockfile.requiredArtifacts.capabilityIndexSnapshot.artifactHash,
	});

	addMismatch({
		code: "artifact_mismatch_error",
		message:
			"Symbol graph artifact id in lockfile does not match expected identity.",
		path: "lockfile.requiredArtifacts.symbolGraphSnapshot.artifactId",
		expected: authoringRequiredArtifactIds.symbolGraphSnapshot,
		actual: context.lockfile.requiredArtifacts.symbolGraphSnapshot.artifactId,
	});
	addMismatch({
		code: "artifact_mismatch_error",
		message:
			"Symbol graph artifact version in lockfile does not match snapshot.",
		path: "lockfile.requiredArtifacts.symbolGraphSnapshot.artifactVersion",
		expected: context.symbolGraphSnapshot.artifactVersion,
		actual:
			context.lockfile.requiredArtifacts.symbolGraphSnapshot.artifactVersion,
	});
	addMismatch({
		code: "artifact_mismatch_error",
		message: "Symbol graph artifact hash in lockfile does not match snapshot.",
		path: "lockfile.requiredArtifacts.symbolGraphSnapshot.artifactHash",
		expected: context.symbolGraphSnapshot.artifactHash,
		actual: context.lockfile.requiredArtifacts.symbolGraphSnapshot.artifactHash,
	});

	return authoringParityStateSchema.parse({
		status: issues.length > 0 ? "mismatch" : "matched",
		lockfileHash: context.lockfile.artifactHash,
		issues: [...issues].sort(byDiagnosticOrder),
	});
};
