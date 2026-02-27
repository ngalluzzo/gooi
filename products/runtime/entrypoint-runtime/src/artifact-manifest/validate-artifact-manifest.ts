import { validateArtifactManifest } from "@gooi/artifact-model/validation";
import type { CompiledEntrypointBundle } from "@gooi/spec-compiler/contracts";

/**
 * Validates compiled manifest integrity and required runtime activation references.
 */
export const validateRuntimeArtifactManifest = (
	bundle: CompiledEntrypointBundle,
): ReturnType<typeof validateArtifactManifest> => {
	const runtimeArtifact = bundle.laneArtifacts.runtimeEntrypointContracts;
	const bindingRequirementsArtifact = bundle.laneArtifacts.bindingRequirements;
	const runtimeExpectation = {
		lane: "runtime" as const,
		...(runtimeArtifact?.artifactId === undefined
			? {}
			: { artifactId: runtimeArtifact.artifactId }),
		...(runtimeArtifact?.artifactVersion === undefined
			? {}
			: { artifactVersion: runtimeArtifact.artifactVersion }),
		...(runtimeArtifact?.artifactHash === undefined
			? {}
			: { artifactHash: runtimeArtifact.artifactHash }),
		hashAlgorithm: "sha256" as const,
	};
	const bindingExpectation = {
		lane: "marketplace" as const,
		...(bindingRequirementsArtifact?.artifactId === undefined
			? {}
			: { artifactId: bindingRequirementsArtifact.artifactId }),
		...(bindingRequirementsArtifact?.artifactVersion === undefined
			? {}
			: { artifactVersion: bindingRequirementsArtifact.artifactVersion }),
		...(bindingRequirementsArtifact?.artifactHash === undefined
			? {}
			: { artifactHash: bindingRequirementsArtifact.artifactHash }),
		hashAlgorithm: "sha256" as const,
	};

	return validateArtifactManifest({
		manifest: bundle.artifactManifest,
		requiredArtifacts: {
			runtimeEntrypointContracts: runtimeExpectation,
			bindingRequirements: bindingExpectation,
		},
		verifyAggregateHash: true,
	});
};
