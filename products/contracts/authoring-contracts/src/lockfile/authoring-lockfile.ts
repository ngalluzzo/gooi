import { sha256, stableStringify } from "@gooi/stable-json";
import { z } from "zod";

const artifactHashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const envelopeVersionSchema = z.literal("1.0.0");

/**
 * Canonical artifact ids referenced by authoring lockfile parity checks.
 */
export const authoringRequiredArtifactIds = {
	compiledEntrypointBundle: "CompiledEntrypointBundle",
	capabilityIndexSnapshot: "CapabilityIndexSnapshot",
	symbolGraphSnapshot: "SymbolGraphSnapshot",
} as const;

/**
 * Canonical artifact identity used by lockfile parity.
 */
export const authoringArtifactIdentitySchema = z.object({
	artifactId: z.string().min(1),
	artifactVersion: z.string().min(1),
	artifactHash: artifactHashSchema,
});

const requiredArtifactsSchema = z.object({
	compiledEntrypointBundle: authoringArtifactIdentitySchema,
	capabilityIndexSnapshot: authoringArtifactIdentitySchema,
	symbolGraphSnapshot: authoringArtifactIdentitySchema,
});

const catalogSnapshotSchema = z.object({
	catalogSource: z.string().min(1),
	catalogVersion: z.string().min(1),
	catalogHash: artifactHashSchema,
});

const envelopeVersionSetSchema = z.object({
	authoringRequestEnvelope: envelopeVersionSchema,
	authoringResultEnvelope: envelopeVersionSchema,
	authoringErrorEnvelope: envelopeVersionSchema,
	authoringDiagnosticsEnvelope: envelopeVersionSchema,
});

const remoteSourceSchema = z.object({
	id: z.string().min(1),
	url: z.url(),
	fetchedAt: z.iso.datetime(),
});

/**
 * Core lockfile payload used to compute deterministic lockfile artifact hash.
 */
export const authoringLockfileContentSchema = z.object({
	artifactVersion: envelopeVersionSchema,
	sourceHash: artifactHashSchema,
	sourceKind: z.literal("workspace-local"),
	requiredArtifacts: requiredArtifactsSchema,
	catalogSnapshot: catalogSnapshotSchema,
	envelopeVersions: envelopeVersionSetSchema,
	remoteSource: remoteSourceSchema.optional(),
});

/**
 * Core lockfile payload without `artifactHash`.
 */
export type AuthoringLockfileContent = z.infer<
	typeof authoringLockfileContentSchema
>;

/**
 * Authoring lockfile artifact including deterministic hash.
 */
export const authoringLockfileSchema = authoringLockfileContentSchema.extend({
	artifactHash: artifactHashSchema,
});

/**
 * Parsed authoring lockfile.
 */
export type AuthoringLockfile = z.infer<typeof authoringLockfileSchema>;

/**
 * Computes deterministic lockfile artifact hash from normalized lockfile content.
 *
 * @param content - Lockfile content without artifact hash.
 * @returns SHA-256 artifact hash.
 *
 * @example
 * computeAuthoringLockfileArtifactHash(content);
 */
export const computeAuthoringLockfileArtifactHash = (
	content: AuthoringLockfileContent,
): string => sha256(stableStringify(content));

/**
 * Creates a lockfile and assigns deterministic artifact hash.
 *
 * @param value - Untrusted lockfile content.
 * @returns Lockfile with deterministic `artifactHash`.
 *
 * @example
 * createAuthoringLockfile(content);
 */
export const createAuthoringLockfile = (value: unknown): AuthoringLockfile => {
	const content = authoringLockfileContentSchema.parse(value);
	return {
		...content,
		artifactHash: computeAuthoringLockfileArtifactHash(content),
	};
};

/**
 * Parses a lockfile and enforces artifact hash integrity.
 *
 * @param value - Untrusted lockfile value.
 * @returns Parsed lockfile.
 * @throws {Error} When the `artifactHash` does not match normalized lockfile content.
 *
 * @example
 * parseAuthoringLockfile(rawLockfile);
 */
export const parseAuthoringLockfile = (value: unknown): AuthoringLockfile => {
	const lockfile = authoringLockfileSchema.parse(value);
	const { artifactHash, ...content } = lockfile;
	const expectedArtifactHash = computeAuthoringLockfileArtifactHash(content);

	if (artifactHash !== expectedArtifactHash) {
		throw new Error(
			"Authoring lockfile artifactHash does not match normalized lockfile content.",
		);
	}

	return lockfile;
};
