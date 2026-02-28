import {
	type CompiledBindingRequirements,
	type CompiledReachabilityRequirement,
	compiledContracts,
} from "@gooi/app-spec-contracts/compiled";
import { sha256, stableStringify } from "@gooi/stable-json";

const bindingRequirementsArtifactHashInput = (
	artifact: Omit<CompiledBindingRequirements, "artifactHash">,
): string => sha256(stableStringify(artifact));

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
		artifactVersion:
			compiledContracts.compiledBindingRequirementsArtifactVersionSchema.value,
		requirements: normalizeRequirements(requirements),
		compatibility: {
			resolverInputContract: "CapabilityReachabilityRequirement@1.0.0",
			runtimeResolutionContract: "CapabilityBindingResolution@1.0.0",
			supportedModes: [
				...compiledContracts.compiledReachabilityModeSchema.options,
			],
		},
	};

	return {
		...partialArtifact,
		artifactHash: bindingRequirementsArtifactHashInput(partialArtifact),
	};
};
