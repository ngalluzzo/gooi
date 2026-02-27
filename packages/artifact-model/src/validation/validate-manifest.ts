import {
	type CompiledArtifactManifest,
	calculateManifestAggregateHash,
	type LaneId,
	safeParseCompiledArtifactManifest,
} from "@gooi/artifact-model/manifest";
import {
	type ManifestSignaturePolicy,
	validateManifestSignaturesForPolicy,
} from "@gooi/artifact-model/trust-policy";

const sortDiagnostics = <
	T extends { readonly path: string; readonly code: string },
>(
	diagnostics: readonly T[],
): readonly T[] =>
	[...diagnostics].sort((left, right) => {
		const pathDelta = left.path.localeCompare(right.path);
		if (pathDelta !== 0) {
			return pathDelta;
		}
		return left.code.localeCompare(right.code);
	});

/**
 * Typed diagnostic codes for manifest validation.
 */
export type ArtifactManifestValidationCode =
	| "manifest_schema_error"
	| "manifest_compatibility_error"
	| "artifact_missing_error"
	| "artifact_mismatch_error"
	| "manifest_signature_missing_error"
	| "manifest_signature_policy_error";

/**
 * One deterministic manifest validation diagnostic.
 */
export interface ArtifactManifestValidationDiagnostic {
	readonly code: ArtifactManifestValidationCode;
	readonly path: string;
	readonly message: string;
	readonly expected?: unknown;
	readonly actual?: unknown;
}

interface RequiredArtifactExpectation {
	readonly lane?: LaneId;
	readonly artifactId?: string;
	readonly artifactVersion?: string;
	readonly artifactHash?: string;
	readonly hashAlgorithm?: "sha256";
}

/**
 * Validation input for artifact manifests.
 */
export interface ValidateArtifactManifestInput {
	readonly manifest: unknown;
	readonly requiredArtifacts?: Readonly<
		Record<string, RequiredArtifactExpectation>
	>;
	readonly verifyAggregateHash?: boolean;
	readonly signaturePolicy?: ManifestSignaturePolicy;
}

/**
 * Validation result for artifact manifests.
 */
export type ValidateArtifactManifestResult =
	| {
			readonly ok: true;
			readonly manifest: CompiledArtifactManifest;
	  }
	| {
			readonly ok: false;
			readonly diagnostics: readonly ArtifactManifestValidationDiagnostic[];
	  };

const normalizePath = (path: readonly (string | number)[]): string =>
	path.map((segment) => String(segment)).join(".");

/**
 * Validates manifest schema, integrity hash, and required compatibility references.
 */
export const validateArtifactManifest = (
	input: ValidateArtifactManifestInput,
): ValidateArtifactManifestResult => {
	const diagnostics: ArtifactManifestValidationDiagnostic[] = [];
	const parsed = safeParseCompiledArtifactManifest(input.manifest);
	if (!parsed.success) {
		for (const issue of parsed.error.issues) {
			diagnostics.push({
				code: "manifest_schema_error",
				path: normalizePath(issue.path),
				message: issue.message,
			});
		}
		return {
			ok: false,
			diagnostics: sortDiagnostics(diagnostics),
		};
	}

	const manifest = parsed.data;
	if (manifest.artifactVersion !== "2.0.0") {
		diagnostics.push({
			code: "manifest_compatibility_error",
			path: "artifactVersion",
			message:
				"Compiled artifact manifest version is incompatible with this validator.",
			expected: "2.0.0",
			actual: manifest.artifactVersion,
		});
	}

	if (input.verifyAggregateHash ?? true) {
		const { aggregateHash: _ignoredHash, ...manifestWithoutHash } = manifest;
		const expectedHash = calculateManifestAggregateHash(manifestWithoutHash);
		if (expectedHash !== manifest.aggregateHash) {
			diagnostics.push({
				code: "artifact_mismatch_error",
				path: "aggregateHash",
				message:
					"Manifest aggregate hash does not match deterministic manifest payload.",
				expected: expectedHash,
				actual: manifest.aggregateHash,
			});
		}
	}

	for (const [artifactKey, expected] of Object.entries(
		input.requiredArtifacts ?? {},
	)) {
		const actual = manifest.artifacts[artifactKey];
		if (actual === undefined) {
			diagnostics.push({
				code: "artifact_missing_error",
				path: `artifacts.${artifactKey}`,
				message: `Manifest is missing required artifact reference \`${artifactKey}\`.`,
			});
			continue;
		}

		if (expected.lane !== undefined && actual.lane !== expected.lane) {
			diagnostics.push({
				code: "artifact_mismatch_error",
				path: `artifacts.${artifactKey}.lane`,
				message: `Artifact lane mismatch for \`${artifactKey}\`.`,
				expected: expected.lane,
				actual: actual.lane,
			});
		}

		if (
			expected.artifactId !== undefined &&
			actual.artifactId !== expected.artifactId
		) {
			diagnostics.push({
				code: "artifact_mismatch_error",
				path: `artifacts.${artifactKey}.artifactId`,
				message: `Artifact id mismatch for \`${artifactKey}\`.`,
				expected: expected.artifactId,
				actual: actual.artifactId,
			});
		}

		if (
			expected.artifactVersion !== undefined &&
			actual.artifactVersion !== expected.artifactVersion
		) {
			diagnostics.push({
				code: "artifact_mismatch_error",
				path: `artifacts.${artifactKey}.artifactVersion`,
				message: `Artifact version mismatch for \`${artifactKey}\`.`,
				expected: expected.artifactVersion,
				actual: actual.artifactVersion,
			});
		}

		if (
			expected.artifactHash !== undefined &&
			actual.artifactHash !== expected.artifactHash
		) {
			diagnostics.push({
				code: "artifact_mismatch_error",
				path: `artifacts.${artifactKey}.artifactHash`,
				message: `Artifact hash mismatch for \`${artifactKey}\`.`,
				expected: expected.artifactHash,
				actual: actual.artifactHash,
			});
		}

		if (
			expected.hashAlgorithm !== undefined &&
			actual.hashAlgorithm !== expected.hashAlgorithm
		) {
			diagnostics.push({
				code: "artifact_mismatch_error",
				path: `artifacts.${artifactKey}.hashAlgorithm`,
				message: `Artifact hash algorithm mismatch for \`${artifactKey}\`.`,
				expected: expected.hashAlgorithm,
				actual: actual.hashAlgorithm,
			});
		}
	}

	const signatureValidation = validateManifestSignaturesForPolicy(
		input.signaturePolicy === undefined
			? { manifest }
			: { manifest, policy: input.signaturePolicy },
	);
	if (!signatureValidation.ok) {
		diagnostics.push(...signatureValidation.diagnostics);
	}

	if (diagnostics.length > 0) {
		return {
			ok: false,
			diagnostics: sortDiagnostics(diagnostics),
		};
	}

	return { ok: true, manifest };
};
