import {
	type JsonObject,
	type JsonValue,
	jsonObjectSchema,
} from "@gooi/contract-primitives/json";
import { sha256, stableStringify } from "@gooi/stable-json";
import { z } from "zod";

/**
 * Supported lane ids for canonical artifact references.
 */
export const laneIdSchema = z.enum([
	"authoring",
	"runtime",
	"quality",
	"marketplace",
	"deployment",
]);

/**
 * Supported hash algorithms for artifact integrity.
 */
export const artifactHashAlgorithmSchema = z.literal("sha256");

/**
 * Lane artifact record contract version.
 */
export const compiledLaneArtifactVersionSchema = z.literal("1.0.0");

/**
 * Artifact-manifest contract version.
 */
export const compiledArtifactManifestVersionSchema = z.literal("2.0.0");

/**
 * Canonical reference schema for one lane artifact.
 */
export const laneArtifactReferenceSchema = z
	.object({
		refVersion: compiledLaneArtifactVersionSchema,
		lane: laneIdSchema,
		artifactId: z.string().min(1),
		artifactVersion: z.string().min(1),
		artifactHash: z.string().min(1),
		hashAlgorithm: artifactHashAlgorithmSchema,
		compatibility: jsonObjectSchema.optional(),
	})
	.strict();

/**
 * Deterministic lane artifact container.
 */
export const compiledLaneArtifactSchema = z
	.object({
		artifactId: z.string().min(1),
		artifactVersion: z.string().min(1),
		lane: laneIdSchema,
		hashAlgorithm: artifactHashAlgorithmSchema,
		payload: z.any(),
		artifactHash: z.string().min(1),
	})
	.strict();

/**
 * Canonical artifact manifest schema.
 */
export const compiledArtifactManifestSchema = z
	.object({
		artifactVersion: compiledArtifactManifestVersionSchema,
		hashAlgorithm: artifactHashAlgorithmSchema,
		artifacts: z.record(z.string(), laneArtifactReferenceSchema),
		signatures: z.record(z.string(), z.string()).optional(),
		aggregateHash: z.string().min(1),
	})
	.strict();

export type LaneId = z.infer<typeof laneIdSchema>;
export type ArtifactHashAlgorithm = z.infer<typeof artifactHashAlgorithmSchema>;
export type LaneArtifactReference = z.infer<typeof laneArtifactReferenceSchema>;
export type CompiledLaneArtifact = z.infer<typeof compiledLaneArtifactSchema>;
export type CompiledArtifactManifest = z.infer<
	typeof compiledArtifactManifestSchema
>;

interface SafeParseIssue {
	readonly path: readonly (string | number)[];
	readonly message: string;
}

interface SafeParseError {
	readonly issues: readonly SafeParseIssue[];
}

export type SafeParseResult<T> =
	| { readonly success: true; readonly data: T }
	| { readonly success: false; readonly error: SafeParseError };

const sortObjectEntries = <T>(
	value: Readonly<Record<string, T>>,
): Readonly<Record<string, T>> =>
	Object.fromEntries(
		Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
	);

const laneArtifactHashInput = (
	artifact: Omit<CompiledLaneArtifact, "artifactHash">,
): string => sha256(stableStringify(artifact));

const manifestHashInput = (
	manifest: Omit<CompiledArtifactManifest, "aggregateHash">,
): string => sha256(stableStringify(manifest));

/**
 * Builds one deterministic lane artifact.
 */
export const buildLaneArtifact = (input: {
	readonly artifactId: string;
	readonly artifactVersion: string;
	readonly lane: LaneId;
	readonly payload: JsonValue | Readonly<object>;
}): CompiledLaneArtifact => {
	const partialArtifact: Omit<CompiledLaneArtifact, "artifactHash"> = {
		artifactId: input.artifactId,
		artifactVersion: input.artifactVersion,
		lane: input.lane,
		hashAlgorithm: artifactHashAlgorithmSchema.value,
		payload: input.payload,
	};
	return {
		...partialArtifact,
		artifactHash: laneArtifactHashInput(partialArtifact),
	};
};

/**
 * Derives a manifest reference from one compiled lane artifact.
 */
export const toLaneArtifactReference = (
	artifact: CompiledLaneArtifact,
	compatibility?: JsonObject | Readonly<object>,
): LaneArtifactReference => {
	const parsedCompatibility =
		compatibility === undefined
			? undefined
			: jsonObjectSchema.parse(compatibility);
	return {
		refVersion: compiledLaneArtifactVersionSchema.value,
		lane: artifact.lane,
		artifactId: artifact.artifactId,
		artifactVersion: artifact.artifactVersion,
		artifactHash: artifact.artifactHash,
		hashAlgorithm: artifact.hashAlgorithm,
		...(parsedCompatibility === undefined
			? {}
			: { compatibility: parsedCompatibility }),
	};
};

/**
 * Computes manifest aggregate hash from a manifest payload without hash field.
 */
export const calculateManifestAggregateHash = (
	manifest: Omit<CompiledArtifactManifest, "aggregateHash">,
): string => manifestHashInput(manifest);

/**
 * Builds deterministic artifact manifest from lane artifact references.
 */
export const buildArtifactManifest = (input: {
	readonly artifacts: Readonly<Record<string, LaneArtifactReference>>;
	readonly signatures?: Readonly<Record<string, string>>;
}): CompiledArtifactManifest => {
	const partialManifest: Omit<CompiledArtifactManifest, "aggregateHash"> = {
		artifactVersion: compiledArtifactManifestVersionSchema.value,
		hashAlgorithm: artifactHashAlgorithmSchema.value,
		artifacts: sortObjectEntries(input.artifacts),
		...(input.signatures === undefined
			? {}
			: { signatures: sortObjectEntries(input.signatures) }),
	};

	return {
		...partialManifest,
		aggregateHash: calculateManifestAggregateHash(partialManifest),
	};
};

/**
 * Builds deterministic manifest directly from lane artifacts.
 */
export const buildArtifactManifestFromArtifacts = (input: {
	readonly artifacts: Readonly<Record<string, CompiledLaneArtifact>>;
	readonly compatibilityByArtifactKey?: Readonly<
		Record<string, JsonObject | Readonly<object>>
	>;
	readonly signatures?: Readonly<Record<string, string>>;
}): CompiledArtifactManifest => {
	const artifactReferences: Record<string, LaneArtifactReference> = {};
	for (const [artifactKey, artifact] of Object.entries(input.artifacts)) {
		artifactReferences[artifactKey] = toLaneArtifactReference(
			artifact,
			input.compatibilityByArtifactKey?.[artifactKey],
		);
	}
	return buildArtifactManifest(
		input.signatures === undefined
			? { artifacts: artifactReferences }
			: { artifacts: artifactReferences, signatures: input.signatures },
	);
};

/**
 * Parses and validates a compiled artifact manifest.
 */
export const parseCompiledArtifactManifest = (
	value: unknown,
): CompiledArtifactManifest => compiledArtifactManifestSchema.parse(value);

/**
 * Safely parses and validates a compiled artifact manifest.
 */
export const safeParseCompiledArtifactManifest = (
	value: unknown,
): SafeParseResult<CompiledArtifactManifest> => {
	const parsed = compiledArtifactManifestSchema.safeParse(value);
	if (!parsed.success) {
		return {
			success: false,
			error: {
				issues: parsed.error.issues.map((issue) => ({
					path: issue.path
						.filter(
							(segment): segment is string | number =>
								typeof segment === "string" || typeof segment === "number",
						)
						.map((segment) => segment),
					message: issue.message,
				})),
			},
		};
	}

	return {
		success: true,
		data: parsed.data,
	};
};
