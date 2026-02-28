import { createTrustError, type TrustErrorCode } from "./errors";
import {
	type ArtifactSignature,
	type ProvenanceAttestation,
	type TrustClaim,
	type TrustDecisionReport,
	type VerifyReleaseTrustParsedInput,
	verifyReleaseTrustInputSchema,
} from "./model";
import type { VerifyReleaseTrustResult } from "./result";

const isSignatureShapeValid = (
	signature: ArtifactSignature,
	artifactHash: string,
): boolean => {
	return (
		signature.signedArtifactHash === artifactHash &&
		signature.signature.startsWith("sig:")
	);
};

const hasRequiredBuilders = (
	attestations: readonly ProvenanceAttestation[],
	requiredBuilderIds: readonly string[],
): boolean => {
	const builders = new Set(
		attestations.map((attestation) => attestation.builderId),
	);
	return requiredBuilderIds.every((builderId) => builders.has(builderId));
};

const isProvenanceValid = (
	attestations: readonly ProvenanceAttestation[],
	artifactHash: string,
): boolean => {
	return attestations.every((attestation) => {
		return (
			attestation.subjectArtifactHash === artifactHash &&
			isSignatureShapeValid(attestation.signature, artifactHash)
		);
	});
};

const toTrustClaims = (input: VerifyReleaseTrustParsedInput): TrustClaim[] => {
	return [
		{
			claimId: "subject.id",
			value: input.subject.subjectId,
			verified:
				input.policy.requiredSubjectIds.length === 0 ||
				input.policy.requiredSubjectIds.includes(input.subject.subjectId),
		},
		{
			claimId: "artifact.signature",
			value: String(input.signatures.length),
			verified:
				!input.policy.requireArtifactSignature ||
				(input.signatures.length > 0 &&
					input.signatures.every((signature) =>
						isSignatureShapeValid(signature, input.artifactHash),
					)),
		},
		{
			claimId: "provenance.attestation",
			value: String(input.attestations.length),
			verified:
				!input.policy.requireProvenanceAttestation ||
				(input.attestations.length > 0 &&
					isProvenanceValid(input.attestations, input.artifactHash)),
		},
		{
			claimId: "certification.status",
			value: input.certificationStatus,
			verified: input.certificationStatus === "certified",
		},
	].sort((left, right) => left.claimId.localeCompare(right.claimId));
};

const toDecisionReport = (
	input: VerifyReleaseTrustParsedInput,
	verified: boolean,
	reasons: readonly string[],
): TrustDecisionReport => {
	return {
		subject: input.subject,
		profileId: input.policy.profileId,
		mode: input.mode,
		evaluatedAt: input.evaluatedAt,
		verified,
		verdict: input.revoked ? "revoked" : verified ? "trusted" : "untrusted",
		claims: toTrustClaims(input),
		reasons: [...reasons].sort((left, right) => left.localeCompare(right)),
	};
};

const toViolation = (
	code: TrustErrorCode,
	message: string,
	path: readonly PropertyKey[],
): { code: TrustErrorCode; message: string; path: readonly PropertyKey[] } => ({
	code,
	message,
	path,
});

export const verifyReleaseTrust = (
	value: unknown,
): VerifyReleaseTrustResult => {
	const parsedInput = verifyReleaseTrustInputSchema.safeParse(value);
	if (!parsedInput.success) {
		return {
			ok: false,
			error: createTrustError(
				"trust_request_schema_error",
				"Trust verification input failed schema validation.",
				parsedInput.error.issues,
			),
		};
	}

	const input = parsedInput.data;
	const violations: {
		code: TrustErrorCode;
		message: string;
		path: readonly PropertyKey[];
	}[] = [];

	if (
		input.policy.requiredSubjectIds.length > 0 &&
		!input.policy.requiredSubjectIds.includes(input.subject.subjectId)
	) {
		violations.push(
			toViolation(
				"trust_identity_error",
				"Trust subject is not permitted by trust policy.",
				["subject", "subjectId"],
			),
		);
	}

	if (
		input.policy.requireArtifactSignature &&
		(input.signatures.length === 0 ||
			!input.signatures.every((signature) =>
				isSignatureShapeValid(signature, input.artifactHash),
			))
	) {
		violations.push(
			toViolation(
				"trust_signature_invalid_error",
				"Artifact signatures are missing or invalid for the declared artifact hash.",
				["signatures"],
			),
		);
	}

	if (
		input.policy.requireProvenanceAttestation &&
		(input.attestations.length === 0 ||
			!isProvenanceValid(input.attestations, input.artifactHash))
	) {
		violations.push(
			toViolation(
				"trust_provenance_invalid_error",
				"Provenance attestations are missing or invalid for the declared artifact hash.",
				["attestations"],
			),
		);
	}

	if (
		input.policy.requiredBuilderIds.length > 0 &&
		!hasRequiredBuilders(input.attestations, input.policy.requiredBuilderIds)
	) {
		violations.push(
			toViolation(
				"trust_policy_violation_error",
				"Trust policy required provenance builders were not present.",
				["policy", "requiredBuilderIds"],
			),
		);
	}

	if (input.revoked) {
		violations.push(
			toViolation("trust_revoked_error", "Release trust status is revoked.", [
				"revoked",
			]),
		);
	}

	const failClosed = input.policy.failClosedModes.includes(input.mode);
	if (
		failClosed &&
		input.policy.requireCertifiedStatusInFailClosedModes &&
		input.certificationStatus !== "certified"
	) {
		violations.push(
			toViolation(
				"trust_certification_missing_error",
				"Fail-closed trust policy requires certified certification status.",
				["certificationStatus"],
			),
		);
	}

	if (violations.length === 0) {
		return {
			ok: true,
			report: toDecisionReport(input, true, []),
		};
	}

	if (failClosed) {
		const firstViolation = violations[0];
		if (firstViolation === undefined) {
			return {
				ok: false,
				error: createTrustError(
					"trust_policy_violation_error",
					"Trust verification failed under fail-closed mode.",
				),
			};
		}
		return {
			ok: false,
			error: createTrustError(
				firstViolation.code,
				firstViolation.message,
				violations.map((violation) => ({
					path: violation.path,
					message: violation.message,
				})),
			),
		};
	}

	return {
		ok: true,
		report: toDecisionReport(
			input,
			false,
			violations.map((violation) => violation.code),
		),
	};
};
