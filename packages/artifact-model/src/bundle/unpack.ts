import {
	type JsonObject,
	parseJsonObject,
} from "@gooi/contract-primitives/json";
import {
	type ArtifactManifestValidationDiagnostic,
	validateArtifactManifest,
} from "../validation/validate-manifest";
import {
	type PackagedBundleDiagnostic,
	packagedAppBundleSchema,
	type UnpackPackagedBundleInput,
	type UnpackPackagedBundleResult,
} from "./schema";
import { bundleHashInput, decompressPayload, sortKeys } from "./utils";

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
			diagnostics,
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
			diagnostics,
		};
	}

	const unpackedArtifacts: Record<string, JsonObject> = {};
	for (const [artifactKey, artifactRef] of Object.entries(
		bundle.manifest.artifacts,
	)) {
		const compressed = bundle.artifacts[artifactKey];
		if (compressed === undefined) {
			diagnostics.push({
				code: "artifact_missing_error",
				path: `artifacts.${artifactKey}`,
				message:
					"Packed bundle is missing an artifact payload referenced by the manifest.",
			});
			continue;
		}

		try {
			const unpacked = parseJsonObject(decompressPayload(compressed.payload));
			unpackedArtifacts[artifactKey] = unpacked;

			const unpackedHash =
				typeof unpacked.artifactHash === "string"
					? unpacked.artifactHash
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
			diagnostics,
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
