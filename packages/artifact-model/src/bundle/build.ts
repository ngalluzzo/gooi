import { compiledArtifactManifestVersionSchema } from "@gooi/artifact-model/manifest";
import { validateArtifactManifest } from "@gooi/artifact-model/validation";
import {
	type BuildPackagedBundleInput,
	type PackagedAppBundle,
	packagedAppBundleVersionSchema,
	packagedBundleCompressionSchema,
	packagedBundleEncodingSchema,
} from "./schema";
import { bundleHashInput, compressPayload, sortKeys } from "./utils";

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

		const record = artifact as { readonly artifactHash?: string };
		const artifactHash =
			typeof record.artifactHash === "string" ? record.artifactHash : undefined;
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
