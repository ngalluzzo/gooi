/**
 * Canonical boundary contract API.
 */
import * as authoring_lockfile from "./authoring-lockfile";

export type {
	AuthoringLockfile,
	AuthoringLockfileContent,
} from "./authoring-lockfile";

export const lockfileContracts = Object.freeze({
	authoringRequiredArtifactIds: authoring_lockfile.authoringRequiredArtifactIds,
	authoringArtifactIdentitySchema:
		authoring_lockfile.authoringArtifactIdentitySchema,
	authoringLockfileContentSchema:
		authoring_lockfile.authoringLockfileContentSchema,
	authoringLockfileSchema: authoring_lockfile.authoringLockfileSchema,
	computeAuthoringLockfileArtifactHash:
		authoring_lockfile.computeAuthoringLockfileArtifactHash,
	createAuthoringLockfile: authoring_lockfile.createAuthoringLockfile,
	parseAuthoringLockfile: authoring_lockfile.parseAuthoringLockfile,
});
