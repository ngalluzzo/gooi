import { sha256, stableStringify } from "@gooi/stable-json";
import {
	type CompiledArtifactManifest,
	type CompiledBindingRequirements,
	type CompiledReachabilityRequirement,
	compiledArtifactManifestVersionSchema,
	compiledBindingRequirementsArtifactVersionSchema,
	compiledReachabilityModeSchema,
} from "./compile.contracts";

const bindingRequirementsArtifactHashInput = (
	artifact: Omit<CompiledBindingRequirements, "artifactHash">,
): string => sha256(stableStringify(artifact));

const artifactManifestHashInput = (
	manifest: Omit<CompiledArtifactManifest, "aggregateHash">,
): string => sha256(stableStringify(manifest));

const normalizeRequirements = (
	requirements: Readonly<Record<string, CompiledReachabilityRequirement>>,
): Readonly<Record<string, CompiledReachabilityRequirement>> =>
	Object.fromEntries(
		Object.entries(requirements).sort(([left], [right]) =>
			left.localeCompare(right),
		),
	);

/**
 * Compiles deterministic deployment resolver binding requirements artifact.
 *
 * @param requirements - Canonical reachability requirements keyed by capability.
 * @returns Compiled binding requirements artifact with deterministic hash.
 */
export const compileBindingRequirementsArtifact = (
	requirements: Readonly<Record<string, CompiledReachabilityRequirement>>,
): CompiledBindingRequirements => {
	const partialArtifact: Omit<CompiledBindingRequirements, "artifactHash"> = {
		artifactId: "CompiledBindingRequirements",
		artifactVersion: compiledBindingRequirementsArtifactVersionSchema.value,
		requirements: normalizeRequirements(requirements),
		compatibility: {
			resolverInputContract: "CapabilityReachabilityRequirement@1.0.0",
			runtimeResolutionContract: "CapabilityBindingResolution@1.0.0",
			supportedModes: [...compiledReachabilityModeSchema.options],
		},
	};

	return {
		...partialArtifact,
		artifactHash: bindingRequirementsArtifactHashInput(partialArtifact),
	};
};

/**
 * Compiles deterministic manifest references for emitted lane artifacts.
 *
 * @param bindingRequirements - Compiled binding requirements artifact.
 * @returns Compiled artifact manifest containing binding requirements identity.
 */
export const compileArtifactManifest = (
	bindingRequirements: CompiledBindingRequirements,
): CompiledArtifactManifest => {
	const partialManifest: Omit<CompiledArtifactManifest, "aggregateHash"> = {
		artifactVersion: compiledArtifactManifestVersionSchema.value,
		artifacts: {
			bindingRequirements: {
				artifactId: bindingRequirements.artifactId,
				artifactVersion: bindingRequirements.artifactVersion,
				artifactHash: bindingRequirements.artifactHash,
				compatibility: bindingRequirements.compatibility,
			},
		},
	};

	return {
		...partialManifest,
		aggregateHash: artifactManifestHashInput(partialManifest),
	};
};
