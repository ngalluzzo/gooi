import type { CompiledEntrypointBundle } from "@gooi/app-spec-contracts/compiled";
import { validateArtifactManifest } from "@gooi/artifact-model/validation";

/**
 * Validates compiled manifest integrity and required runtime activation references.
 */
export const validateRuntimeArtifactManifest = (
	bundle: CompiledEntrypointBundle,
): ReturnType<typeof validateArtifactManifest> => {
	const runtimeArtifact = bundle.laneArtifacts.runtimeEntrypointContracts;
	const bindingRequirementsArtifact = bundle.laneArtifacts.bindingRequirements;
	const projectionArtifact = bundle.laneArtifacts.projectionIR;
	const domainRuntimeArtifact = bundle.laneArtifacts.domainRuntimeIR;
	const sessionArtifact = bundle.laneArtifacts.sessionIR;
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
	const projectionExpectation = {
		lane: "runtime" as const,
		...(projectionArtifact?.artifactId === undefined
			? {}
			: { artifactId: projectionArtifact.artifactId }),
		...(projectionArtifact?.artifactVersion === undefined
			? {}
			: { artifactVersion: projectionArtifact.artifactVersion }),
		...(projectionArtifact?.artifactHash === undefined
			? {}
			: { artifactHash: projectionArtifact.artifactHash }),
		hashAlgorithm: "sha256" as const,
	};
	const domainRuntimeExpectation = {
		lane: "runtime" as const,
		...(domainRuntimeArtifact?.artifactId === undefined
			? {}
			: { artifactId: domainRuntimeArtifact.artifactId }),
		...(domainRuntimeArtifact?.artifactVersion === undefined
			? {}
			: { artifactVersion: domainRuntimeArtifact.artifactVersion }),
		...(domainRuntimeArtifact?.artifactHash === undefined
			? {}
			: { artifactHash: domainRuntimeArtifact.artifactHash }),
		hashAlgorithm: "sha256" as const,
	};
	const sessionExpectation = {
		lane: "runtime" as const,
		...(sessionArtifact?.artifactId === undefined
			? {}
			: { artifactId: sessionArtifact.artifactId }),
		...(sessionArtifact?.artifactVersion === undefined
			? {}
			: { artifactVersion: sessionArtifact.artifactVersion }),
		...(sessionArtifact?.artifactHash === undefined
			? {}
			: { artifactHash: sessionArtifact.artifactHash }),
		hashAlgorithm: "sha256" as const,
	};

	return validateArtifactManifest({
		manifest: bundle.artifactManifest,
		requiredArtifacts: {
			runtimeEntrypointContracts: runtimeExpectation,
			bindingRequirements: bindingExpectation,
			projectionIR: projectionExpectation,
			domainRuntimeIR: domainRuntimeExpectation,
			sessionIR: sessionExpectation,
		},
		verifyAggregateHash: true,
	});
};
