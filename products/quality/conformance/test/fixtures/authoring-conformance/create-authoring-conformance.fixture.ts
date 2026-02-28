import type { RunAuthoringConformanceInput } from "../../../src/authoring-conformance/contracts";
import { capabilityIndexSnapshot } from "./capability-index.fixture";
import {
	compiledEntrypointBundleIdentity,
	createConformanceLockfile,
} from "./lockfile.fixture";
import {
	baseSourceSpec,
	documentText,
	findPosition,
	invalidGuardScenarioSourceSpec,
	invalidReachabilitySourceSpec,
} from "./source-spec.fixture";
import { symbolGraphSnapshot } from "./symbol-graph.fixture";

/**
 * Creates authoring conformance fixture input.
 */
export const createAuthoringConformanceFixture =
	(): RunAuthoringConformanceInput => ({
		context: {
			documentUri: "spec://docs/demo.yml",
			documentPath: "docs/demo.yml",
			documentText,
			sourceSpec: baseSourceSpec,
			compiledEntrypointBundleIdentity,
			capabilityIndexSnapshot,
			symbolGraphSnapshot,
			lockfile: createConformanceLockfile({
				compiledEntrypointBundleHash:
					compiledEntrypointBundleIdentity.artifactHash,
				capabilityIndexHash: capabilityIndexSnapshot.artifactHash,
				symbolGraphHash: symbolGraphSnapshot.artifactHash,
				catalogHash: capabilityIndexSnapshot.catalogIdentity.catalogHash,
			}),
		},
		staleLockfile: createConformanceLockfile({
			compiledEntrypointBundleHash:
				compiledEntrypointBundleIdentity.artifactHash,
			capabilityIndexHash: "8".repeat(64),
			symbolGraphHash: symbolGraphSnapshot.artifactHash,
			catalogHash: capabilityIndexSnapshot.catalogIdentity.catalogHash,
		}),
		invalidReachabilitySourceSpec,
		invalidGuardScenarioSourceSpec,
		positions: {
			capabilityCompletion: { line: 3, character: 10 },
			signalCompletion: { line: 10, character: 10 },
			guardPolicyCompletion: findPosition("onFail:", {
				line: 18,
				character: 10,
			}),
			scenarioPersonaCompletion: findPosition("persona:", {
				line: 22,
				character: 12,
			}),
			expressionReference: { line: 12, character: 10 },
			ambientSymbol: { line: 13, character: 8 },
		},
		renameTarget: "message_ids",
		renameCollisionTarget: "existing_ids",
	});
