import { capabilityIndexSnapshot } from "./authoring-read/capability-index.fixture";
import {
	compiledEntrypointBundleIdentity,
	createAuthoringReadLockfile,
} from "./authoring-read/lockfile.fixture";
import {
	authoringReadDocumentText,
	sourceSpec,
} from "./authoring-read/source-spec.fixture";
import { symbolGraphSnapshot } from "./authoring-read/symbol-graph.fixture";

/**
 * Fixture bundle used across product authoring LSP read-path tests.
 */
export const authoringReadFixture = {
	documentUri: "spec://docs/demo.yml",
	documentPath: "docs/demo.yml",
	documentText: authoringReadDocumentText,
	sourceSpec,
	compiledEntrypointBundleIdentity,
	capabilityIndexSnapshot,
	symbolGraphSnapshot,
	lockfile: createAuthoringReadLockfile({
		compiledEntrypointBundleHash: compiledEntrypointBundleIdentity.artifactHash,
		capabilityIndexHash: capabilityIndexSnapshot.artifactHash,
		symbolGraphHash: symbolGraphSnapshot.artifactHash,
		catalogHash: capabilityIndexSnapshot.catalogIdentity.catalogHash,
	}),
	staleCatalogLockfile: createAuthoringReadLockfile({
		compiledEntrypointBundleHash: compiledEntrypointBundleIdentity.artifactHash,
		capabilityIndexHash: capabilityIndexSnapshot.artifactHash,
		symbolGraphHash: symbolGraphSnapshot.artifactHash,
		catalogHash: "9".repeat(64),
	}),
	staleArtifactLockfile: createAuthoringReadLockfile({
		compiledEntrypointBundleHash: compiledEntrypointBundleIdentity.artifactHash,
		capabilityIndexHash: "8".repeat(64),
		symbolGraphHash: symbolGraphSnapshot.artifactHash,
		catalogHash: capabilityIndexSnapshot.catalogIdentity.catalogHash,
	}),
};
