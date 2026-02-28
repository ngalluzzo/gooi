import { lockfileContracts } from "@gooi/authoring-contracts/lockfile";
import { capabilityIndexSnapshotSchema } from "@gooi/capability-index/contracts";
import { symbolGraphSnapshotSchema } from "@gooi/symbol-graph/contracts";
import { z } from "zod";

const {
	authoringArtifactIdentitySchema,
	authoringLockfileSchema,
	authoringRequiredArtifactIds,
} = lockfileContracts;

const compiledEntrypointBundleIdentitySchema = authoringArtifactIdentitySchema
	.extend({
		artifactId: z.literal(
			authoringRequiredArtifactIds.compiledEntrypointBundle,
		),
	})
	.strict();

/**
 * Snapshot-backed document context required by authoring read-path features.
 */
export const authoringReadContextSchema = z.object({
	documentUri: z.string().min(1),
	documentPath: z.string().min(1),
	documentText: z.string(),
	sourceSpec: z.unknown().optional(),
	compiledEntrypointBundleIdentity: compiledEntrypointBundleIdentitySchema,
	capabilityIndexSnapshot: capabilityIndexSnapshotSchema,
	symbolGraphSnapshot: symbolGraphSnapshotSchema,
	lockfile: authoringLockfileSchema,
});

/**
 * Parsed authoring read context.
 */
export type AuthoringReadContext = z.infer<typeof authoringReadContextSchema>;

/**
 * Parses snapshot-backed read context input.
 *
 * @param value - Untrusted context value.
 * @returns Parsed read context.
 *
 * @example
 * const context = parseAuthoringReadContext(rawContext);
 */
export const parseAuthoringReadContext = (
	value: unknown,
): AuthoringReadContext => authoringReadContextSchema.parse(value);
