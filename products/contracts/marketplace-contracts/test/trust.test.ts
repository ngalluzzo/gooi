import { describe, expect, test } from "bun:test";
import { trustContracts } from "../src/trust/contracts";

const baseInput = {
	subject: {
		subjectType: "release" as const,
		subjectId: "gooi.providers.memory@1.0.0",
		providerId: "gooi.providers.memory",
		providerVersion: "1.0.0",
		namespace: "gooi",
	},
	artifactHash:
		"6a6f9c2f84fcb56af6dcaaf7af66c74d4d2e7070f951e8fbcf48f7cb13f12777",
	signatures: [
		{
			keyId: "publisher-key-1",
			algorithm: "ed25519" as const,
			signature: "sig:publisher-signature",
			signedArtifactHash:
				"6a6f9c2f84fcb56af6dcaaf7af66c74d4d2e7070f951e8fbcf48f7cb13f12777",
			issuedAt: "2026-02-28T10:00:00.000Z",
		},
	],
	attestations: [
		{
			attestationId: "attestation-1",
			builderId: "gooi.builder.ci",
			sourceUri: "https://gooi.dev/source/repo",
			subjectArtifactHash:
				"6a6f9c2f84fcb56af6dcaaf7af66c74d4d2e7070f951e8fbcf48f7cb13f12777",
			issuedAt: "2026-02-28T10:05:00.000Z",
			signature: {
				keyId: "builder-key-1",
				algorithm: "ed25519" as const,
				signature: "sig:builder-signature",
				signedArtifactHash:
					"6a6f9c2f84fcb56af6dcaaf7af66c74d4d2e7070f951e8fbcf48f7cb13f12777",
				issuedAt: "2026-02-28T10:05:00.000Z",
			},
		},
	],
	certificationStatus: "certified" as const,
	revoked: false,
	mode: "production" as const,
	policy: {
		profileId: "global-trust-1.0.0",
		requiredSubjectIds: ["gooi.providers.memory@1.0.0"],
		requiredBuilderIds: ["gooi.builder.ci"],
		requireArtifactSignature: true,
		requireProvenanceAttestation: true,
		failClosedModes: ["certified", "production"] as const,
		requireCertifiedStatusInFailClosedModes: true,
	},
	evaluatedAt: "2026-02-28T10:10:00.000Z",
};

describe("trust verification", () => {
	test("verifies trusted release in fail-closed production mode", () => {
		const result = trustContracts.verifyReleaseTrust(baseInput);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.report.verified).toBe(true);
		expect(result.report.verdict).toBe("trusted");
		expect(result.report.claims.every((claim) => claim.verified)).toBe(true);
	});

	test("fails closed when signatures are missing in production", () => {
		const result = trustContracts.verifyReleaseTrust({
			...baseInput,
			signatures: [],
		});

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.error.code).toBe("trust_signature_invalid_error");
	});

	test("fails closed when certification is not certified in production", () => {
		const result = trustContracts.verifyReleaseTrust({
			...baseInput,
			certificationStatus: "pending",
		});

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.error.code).toBe("trust_certification_missing_error");
	});

	test("returns deterministic untrusted report for development mode violations", () => {
		const first = trustContracts.verifyReleaseTrust({
			...baseInput,
			mode: "development",
			signatures: [],
			attestations: [],
			policy: {
				...baseInput.policy,
				requiredBuilderIds: [],
				failClosedModes: ["production"],
			},
		});
		const second = trustContracts.verifyReleaseTrust({
			...baseInput,
			mode: "development",
			signatures: [],
			attestations: [],
			policy: {
				...baseInput.policy,
				requiredBuilderIds: [],
				failClosedModes: ["production"],
			},
		});

		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		expect(first).toStrictEqual(second);
		if (!first.ok) {
			return;
		}
		expect(first.report.verified).toBe(false);
		expect(first.report.verdict).toBe("untrusted");
		expect(first.report.reasons).toEqual([
			"trust_provenance_invalid_error",
			"trust_signature_invalid_error",
		]);
	});
});
