import {
	type AuthoringLockfile,
	lockfileContracts,
} from "@gooi/authoring-contracts/lockfile";

import { capabilityIndexSnapshot } from "./capability-index.fixture";
import { symbolGraphSnapshot } from "./symbol-graph.fixture";

export const compiledEntrypointBundleIdentity = {
	artifactId:
		lockfileContracts.authoringRequiredArtifactIds.compiledEntrypointBundle,
	artifactVersion: "1.0.0",
	artifactHash: "5".repeat(64),
} as const;

export const createAuthoringReadLockfile = (input: {
	readonly compiledEntrypointBundleHash: string;
	readonly capabilityIndexHash: string;
	readonly symbolGraphHash: string;
	readonly catalogHash: string;
}): AuthoringLockfile =>
	lockfileContracts.createAuthoringLockfile({
		artifactVersion: "1.0.0",
		sourceHash: "4".repeat(64),
		sourceKind: "workspace-local",
		requiredArtifacts: {
			compiledEntrypointBundle: {
				artifactId:
					lockfileContracts.authoringRequiredArtifactIds
						.compiledEntrypointBundle,
				artifactVersion: "1.0.0",
				artifactHash: input.compiledEntrypointBundleHash,
			},
			capabilityIndexSnapshot: {
				artifactId:
					lockfileContracts.authoringRequiredArtifactIds
						.capabilityIndexSnapshot,
				artifactVersion: capabilityIndexSnapshot.artifactVersion,
				artifactHash: input.capabilityIndexHash,
			},
			symbolGraphSnapshot: {
				artifactId:
					lockfileContracts.authoringRequiredArtifactIds.symbolGraphSnapshot,
				artifactVersion: symbolGraphSnapshot.artifactVersion,
				artifactHash: input.symbolGraphHash,
			},
		},
		catalogSnapshot: {
			catalogSource: "demo-catalog",
			catalogVersion: "2026-02-26",
			catalogHash: input.catalogHash,
		},
		envelopeVersions: {
			authoringRequestEnvelope: "1.0.0",
			authoringResultEnvelope: "1.0.0",
			authoringErrorEnvelope: "1.0.0",
			authoringDiagnosticsEnvelope: "1.0.0",
		},
	});
