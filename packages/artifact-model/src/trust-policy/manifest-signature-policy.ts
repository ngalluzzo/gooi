import type { CompiledArtifactManifest } from "@gooi/artifact-model/manifest";
import { z } from "zod";

/**
 * Trust profile used to evaluate manifest signature enforcement.
 */
export const manifestTrustProfileSchema = z.enum([
	"development",
	"ci",
	"certified",
	"production",
]);

/**
 * Policy contract for manifest signature enforcement at artifact-consumer boundaries.
 */
export const manifestSignaturePolicySchema = z.object({
	profile: manifestTrustProfileSchema,
	requireSignatures: z.boolean().optional(),
	requiredSignerIds: z.array(z.string().min(1)).optional(),
});

/**
 * Parsed manifest signature policy.
 */
export type ManifestSignaturePolicy = z.infer<
	typeof manifestSignaturePolicySchema
>;

/**
 * Typed diagnostics for signature policy enforcement.
 */
export type ManifestSignaturePolicyDiagnosticCode =
	| "manifest_signature_missing_error"
	| "manifest_signature_policy_error";

/**
 * One deterministic manifest-signature policy diagnostic.
 */
export interface ManifestSignaturePolicyDiagnostic {
	readonly code: ManifestSignaturePolicyDiagnosticCode;
	readonly path: string;
	readonly message: string;
	readonly expected?: unknown;
	readonly actual?: unknown;
}

const sortDiagnostics = (
	diagnostics: readonly ManifestSignaturePolicyDiagnostic[],
): readonly ManifestSignaturePolicyDiagnostic[] =>
	[...diagnostics].sort((left, right) => {
		const pathDelta = left.path.localeCompare(right.path);
		if (pathDelta !== 0) {
			return pathDelta;
		}
		return left.code.localeCompare(right.code);
	});

const requiresSignatures = (policy: ManifestSignaturePolicy): boolean =>
	policy.requireSignatures ??
	(policy.profile === "certified" || policy.profile === "production");

/**
 * Validates manifest signatures against a trust policy profile.
 */
export const validateManifestSignaturesForPolicy = (input: {
	readonly manifest: CompiledArtifactManifest;
	readonly policy?: ManifestSignaturePolicy;
}):
	| { readonly ok: true }
	| {
			readonly ok: false;
			readonly diagnostics: readonly ManifestSignaturePolicyDiagnostic[];
	  } => {
	const policy =
		input.policy === undefined
			? undefined
			: manifestSignaturePolicySchema.parse(input.policy);
	if (policy === undefined) {
		return { ok: true };
	}

	const diagnostics: ManifestSignaturePolicyDiagnostic[] = [];
	const signatures = input.manifest.signatures ?? {};
	const signatureKeys = Object.keys(signatures);
	const signatureRequired = requiresSignatures(policy);

	if (signatureRequired && signatureKeys.length === 0) {
		diagnostics.push({
			code: "manifest_signature_missing_error",
			path: "signatures",
			message:
				"Manifest signatures are required by trust policy but none were provided.",
			expected: "at least one signature",
			actual: "none",
		});
	}

	const requiredSignerIds = [...new Set(policy.requiredSignerIds ?? [])].sort(
		(left, right) => left.localeCompare(right),
	);
	for (const signerId of requiredSignerIds) {
		const signatureValue = signatures[signerId];
		if (signatureValue === undefined) {
			diagnostics.push({
				code: "manifest_signature_missing_error",
				path: `signatures.${signerId}`,
				message: "Manifest is missing required signer signature.",
				expected: "present",
				actual: "missing",
			});
			continue;
		}
		if (signatureValue.trim().length === 0) {
			diagnostics.push({
				code: "manifest_signature_policy_error",
				path: `signatures.${signerId}`,
				message: "Manifest signer signature must be a non-empty string.",
				expected: "non-empty signature value",
				actual: signatureValue,
			});
		}
	}

	if (diagnostics.length > 0) {
		return {
			ok: false,
			diagnostics: sortDiagnostics(diagnostics),
		};
	}

	return { ok: true };
};
