import type { ArtifactManifestValidationDiagnostic } from "@gooi/artifact-model/validation";
import type { CompiledEntrypointBundle } from "@gooi/spec-compiler/contracts";

/**
 * One required manifest artifact identity captured in activation diagnostics.
 */
export interface RuntimeActivationArtifactIdentity {
	readonly artifactKey: "runtimeEntrypointContracts" | "bindingRequirements";
	readonly lane: "runtime" | "marketplace";
	readonly artifactId: string | null;
	readonly artifactVersion: string | null;
	readonly artifactHash: string | null;
	readonly hashAlgorithm: "sha256";
}

/**
 * Structured activation report attached to runtime manifest failures.
 */
export interface RuntimeActivationReport {
	readonly status: "validated" | "mismatch";
	readonly bundleIdentity: {
		readonly artifactVersion: string;
		readonly artifactHash: string;
		readonly compilerVersion: string;
	};
	readonly manifestIdentity: {
		readonly artifactVersion: string;
		readonly aggregateHash: string;
		readonly hashAlgorithm: "sha256";
	};
	readonly requiredArtifacts: readonly RuntimeActivationArtifactIdentity[];
	readonly diagnostics: readonly ArtifactManifestValidationDiagnostic[];
}

const buildRequiredArtifacts = (
	bundle: CompiledEntrypointBundle,
): readonly RuntimeActivationArtifactIdentity[] => [
	{
		artifactKey: "bindingRequirements",
		lane: "marketplace",
		artifactId: bundle.laneArtifacts.bindingRequirements?.artifactId ?? null,
		artifactVersion:
			bundle.laneArtifacts.bindingRequirements?.artifactVersion ?? null,
		artifactHash:
			bundle.laneArtifacts.bindingRequirements?.artifactHash ?? null,
		hashAlgorithm: "sha256",
	},
	{
		artifactKey: "runtimeEntrypointContracts",
		lane: "runtime",
		artifactId:
			bundle.laneArtifacts.runtimeEntrypointContracts?.artifactId ?? null,
		artifactVersion:
			bundle.laneArtifacts.runtimeEntrypointContracts?.artifactVersion ?? null,
		artifactHash:
			bundle.laneArtifacts.runtimeEntrypointContracts?.artifactHash ?? null,
		hashAlgorithm: "sha256",
	},
];

/**
 * Builds deterministic runtime activation report for manifest validation paths.
 */
export const buildRuntimeActivationReport = (input: {
	readonly bundle: CompiledEntrypointBundle;
	readonly status: "validated" | "mismatch";
	readonly diagnostics?: readonly ArtifactManifestValidationDiagnostic[];
}): RuntimeActivationReport => ({
	status: input.status,
	bundleIdentity: {
		artifactVersion: input.bundle.artifactVersion,
		artifactHash: input.bundle.artifactHash,
		compilerVersion: input.bundle.compilerVersion,
	},
	manifestIdentity: {
		artifactVersion: input.bundle.artifactManifest.artifactVersion,
		aggregateHash: input.bundle.artifactManifest.aggregateHash,
		hashAlgorithm: input.bundle.artifactManifest.hashAlgorithm,
	},
	requiredArtifacts: buildRequiredArtifacts(input.bundle),
	diagnostics: input.diagnostics ?? [],
});
