import {
	type CompiledArtifactManifest,
	compiledArtifactManifestSchema,
} from "@gooi/artifact-model/manifest";
import type { JsonObject, JsonValue } from "@gooi/contract-primitives/json";
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
	| "manifest_compatibility_error"
	| "manifest_signature_missing_error"
	| "manifest_signature_policy_error";

/**
 * One deterministic packaged-bundle diagnostic.
 */
export interface PackagedBundleDiagnostic {
	readonly code: PackagedBundleDiagnosticCode;
	readonly path: string;
	readonly message: string;
	readonly expected?: JsonValue;
	readonly actual?: JsonValue;
}

/**
 * Input payload for building one packaged app bundle.
 */
export interface BuildPackagedBundleInput {
	readonly manifest: CompiledArtifactManifest;
	readonly artifacts: Readonly<Record<string, JsonObject | Readonly<object>>>;
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
	readonly artifacts: Readonly<Record<string, JsonObject>>;
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
