import { zstdCompressSync, zstdDecompressSync } from "node:zlib";
import {
	type CompiledArtifactManifest,
	compiledArtifactManifestSchema,
	compiledArtifactManifestVersionSchema,
} from "@gooi/artifact-model/manifest";
import {
	type ArtifactManifestValidationDiagnostic,
	validateArtifactManifest,
} from "@gooi/artifact-model/validation";
import { sha256, stableStringify } from "@gooi/stable-json";
import { z } from "zod";

/**
 * Packaged bundle contract version.
 */
export const packagedAppBundleVersionSchema = z.literal("1.0.0");

/**
 * Supported bundle compression algorithm.
 */
export const packagedBundleCompressionSchema = z.literal("zstd");

/**
 * Supported bundle payload encoding.
 */
export const packagedBundleEncodingSchema = z.literal("base64");

const packagedArtifactEntrySchema = z
	.object({
		encoding: packagedBundleEncodingSchema,
		payload: z.string().min(1),
	})
	.strict();

/**
 * Optional packaged app-bundle schema.
 */
export const packagedAppBundleSchema = z
	.object({
		artifactVersion: packagedAppBundleVersionSchema,
		hashAlgorithm: z.literal("sha256"),
		compression: packagedBundleCompressionSchema,
		manifest: compiledArtifactManifestSchema,
		artifacts: z.record(z.string(), packagedArtifactEntrySchema),
		bundleHash: z.string().min(1),
	})
	.strict();

export type PackagedAppBundle = z.infer<typeof packagedAppBundleSchema>;

/**
 * Typed diagnostic codes for packaged-bundle workflows.
 */
export type PackagedBundleDiagnosticCode =
	| "bundle_unpack_error"
	| "artifact_missing_error"
	| "artifact_mismatch_error"
	| "manifest_schema_error"
	| "manifest_compatibility_error";

/**
 * One deterministic packaged-bundle diagnostic.
 */
export interface PackagedBundleDiagnostic {
	readonly code: PackagedBundleDiagnosticCode;
	readonly path: string;
	readonly message: string;
	readonly expected?: unknown;
	readonly actual?: unknown;
}

/**
 * Input payload for building one packaged app bundle.
 */
export interface BuildPackagedBundleInput {
	readonly manifest: CompiledArtifactManifest;
	readonly artifacts: Readonly<Record<string, unknown>>;
}

/**
 * Input payload for unpacking and verifying one packaged bundle.
 */
export interface UnpackPackagedBundleInput {
	readonly bundle: unknown;
	readonly verifyManifest?: boolean;
	readonly verifyBundleHash?: boolean;
}

/**
 * Result payload for unpacked packaged bundle contents.
 */
export interface UnpackedPackagedBundle {
	readonly manifest: CompiledArtifactManifest;
	readonly artifacts: Readonly<Record<string, unknown>>;
}

/**
 * Result union for unpacking packaged bundle content.
 */
export type UnpackPackagedBundleResult =
	| {
			readonly ok: true;
			readonly value: UnpackedPackagedBundle;
	  }
	| {
			readonly ok: false;
			readonly diagnostics: readonly PackagedBundleDiagnostic[];
	  };

const sortKeys = <T>(
	value: Readonly<Record<string, T>>,
): Readonly<Record<string, T>> =>
	Object.fromEntries(
		Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
	);

const compressPayload = (value: unknown): string => {
	const source = Buffer.from(stableStringify(value), "utf8");
	return zstdCompressSync(source).toString("base64");
};

const decompressPayload = (value: string): unknown => {
	const decoded = Buffer.from(value, "base64");
	const uncompressed = zstdDecompressSync(decoded).toString("utf8");
	return JSON.parse(uncompressed) as unknown;
};

const normalizeDiagnostics = (
	diagnostics: readonly PackagedBundleDiagnostic[],
): readonly PackagedBundleDiagnostic[] =>
	[...diagnostics].sort((left, right) => {
		const pathDelta = left.path.localeCompare(right.path);
		if (pathDelta !== 0) {
			return pathDelta;
		}
		return left.code.localeCompare(right.code);
	});

const bundleHashInput = (
	bundle: Omit<PackagedAppBundle, "bundleHash">,
): string => sha256(stableStringify(bundle));

const toManifestDiagnostics = (
	diagnostics: readonly ArtifactManifestValidationDiagnostic[],
): readonly PackagedBundleDiagnostic[] =>
	diagnostics.map((diagnostic) => ({
		code: diagnostic.code,
		path: diagnostic.path,
		message: diagnostic.message,
		...(diagnostic.expected === undefined
			? {}
			: { expected: diagnostic.expected }),
		...(diagnostic.actual === undefined ? {} : { actual: diagnostic.actual }),
	}));

/**
 * Builds deterministic packaged app-bundle transport artifact.
 */
export const buildPackagedBundle = (
	input: BuildPackagedBundleInput,
): PackagedAppBundle => {
	const manifestValidation = validateArtifactManifest({
		manifest: input.manifest,
		verifyAggregateHash: true,
	});
	if (!manifestValidation.ok) {
		throw new Error(
			`Invalid manifest for packaged bundle build: ${manifestValidation.diagnostics.map((diagnostic) => `${diagnostic.path}: ${diagnostic.message}`).join("; ")}`,
		);
	}

	const compressedArtifacts: Record<
		string,
		{ encoding: "base64"; payload: string }
	> = {};
	for (const [artifactKey, artifactRef] of Object.entries(
		input.manifest.artifacts,
	)) {
		const artifact = input.artifacts[artifactKey];
		if (artifact === undefined) {
			throw new Error(
				`Cannot package bundle: missing artifact payload for manifest key \`${artifactKey}\`.`,
			);
		}
		compressedArtifacts[artifactKey] = {
			encoding: packagedBundleEncodingSchema.value,
			payload: compressPayload(artifact),
		};

		const record =
			typeof artifact === "object" && artifact !== null
				? (artifact as Record<string, unknown>)
				: undefined;
		const artifactHash =
			typeof record?.artifactHash === "string"
				? record.artifactHash
				: undefined;
		if (artifactHash === undefined) {
			throw new Error(
				`Cannot package bundle: artifact \`${artifactKey}\` is missing \`artifactHash\` field.`,
			);
		}
		if (artifactHash !== artifactRef.artifactHash) {
			throw new Error(
				`Cannot package bundle: artifact hash mismatch for \`${artifactKey}\` while packaging.`,
			);
		}
	}

	const partialBundle: Omit<PackagedAppBundle, "bundleHash"> = {
		artifactVersion: packagedAppBundleVersionSchema.value,
		hashAlgorithm: "sha256",
		compression: packagedBundleCompressionSchema.value,
		manifest: {
			...input.manifest,
			artifactVersion: compiledArtifactManifestVersionSchema.value,
		},
		artifacts: sortKeys(compressedArtifacts),
	};

	return {
		...partialBundle,
		bundleHash: bundleHashInput(partialBundle),
	};
};

/**
 * Unpacks packaged bundle transport format back into lane artifacts.
 */
export const unpackPackagedBundle = (
	input: UnpackPackagedBundleInput,
): UnpackPackagedBundleResult => {
	const diagnostics: PackagedBundleDiagnostic[] = [];
	const parsed = packagedAppBundleSchema.safeParse(input.bundle);
	if (!parsed.success) {
		for (const issue of parsed.error.issues) {
			diagnostics.push({
				code: "bundle_unpack_error",
				path: issue.path.map((segment) => String(segment)).join("."),
				message: issue.message,
			});
		}
		return {
			ok: false,
			diagnostics: normalizeDiagnostics(diagnostics),
		};
	}

	const bundle = parsed.data;
	if (input.verifyBundleHash ?? true) {
		const { bundleHash: _bundleHash, ...withoutHash } = bundle;
		const expectedHash = bundleHashInput(withoutHash);
		if (expectedHash !== bundle.bundleHash) {
			diagnostics.push({
				code: "artifact_mismatch_error",
				path: "bundleHash",
				message:
					"Packaged bundle hash does not match deterministic bundle payload.",
				expected: expectedHash,
				actual: bundle.bundleHash,
			});
		}
	}

	const manifestValidation = validateArtifactManifest({
		manifest: bundle.manifest,
		verifyAggregateHash: input.verifyManifest ?? true,
	});
	if (!manifestValidation.ok) {
		diagnostics.push(...toManifestDiagnostics(manifestValidation.diagnostics));
		return {
			ok: false,
			diagnostics: normalizeDiagnostics(diagnostics),
		};
	}

	const unpackedArtifacts: Record<string, unknown> = {};
	for (const [artifactKey, artifactRef] of Object.entries(
		bundle.manifest.artifacts,
	)) {
		const compressed = bundle.artifacts[artifactKey];
		if (compressed === undefined) {
			diagnostics.push({
				code: "artifact_missing_error",
				path: `artifacts.${artifactKey}`,
				message:
					"Packaged bundle is missing an artifact payload referenced by the manifest.",
			});
			continue;
		}

		try {
			const unpacked = decompressPayload(compressed.payload);
			unpackedArtifacts[artifactKey] = unpacked;

			const unpackedRecord =
				typeof unpacked === "object" && unpacked !== null
					? (unpacked as Record<string, unknown>)
					: undefined;
			const unpackedHash =
				typeof unpackedRecord?.artifactHash === "string"
					? unpackedRecord.artifactHash
					: undefined;
			if (unpackedHash === undefined) {
				diagnostics.push({
					code: "bundle_unpack_error",
					path: `artifacts.${artifactKey}.artifactHash`,
					message:
						"Unpacked artifact payload is missing required artifactHash field.",
				});
				continue;
			}
			if (unpackedHash !== artifactRef.artifactHash) {
				diagnostics.push({
					code: "artifact_mismatch_error",
					path: `artifacts.${artifactKey}.artifactHash`,
					message: "Unpacked artifact hash does not match manifest reference.",
					expected: artifactRef.artifactHash,
					actual: unpackedHash,
				});
			}
		} catch (error) {
			diagnostics.push({
				code: "bundle_unpack_error",
				path: `artifacts.${artifactKey}.payload`,
				message:
					error instanceof Error
						? error.message
						: "Failed to unpack compressed artifact payload.",
			});
		}
	}

	if (diagnostics.length > 0) {
		return {
			ok: false,
			diagnostics: normalizeDiagnostics(diagnostics),
		};
	}

	return {
		ok: true,
		value: {
			manifest: bundle.manifest,
			artifacts: sortKeys(unpackedArtifacts),
		},
	};
};
