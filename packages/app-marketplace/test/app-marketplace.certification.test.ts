import { describe, expect, test } from "bun:test";
import { certificationContracts } from "@gooi/marketplace-contracts/certification";
import { listingContracts } from "@gooi/marketplace-contracts/listing";
import { trustContracts } from "@gooi/marketplace-contracts/trust";
import {
	completeMarketplaceCertification,
	startMarketplaceCertification,
} from "../src/certification/certification";

const seedListingState = () => {
	const published = listingContracts.publishListing({
		state: {
			listings: [],
			auditLog: [],
		},
		actorId: "publisher:alice",
		occurredAt: "2026-02-28T10:00:00.000Z",
		namespaceApprovals: ["gooi"],
		release: {
			providerNamespace: "gooi",
			providerId: "gooi.providers.memory",
			providerVersion: "1.0.0",
			contentHash:
				"6a6f9c2f84fcb56af6dcaaf7af66c74d4d2e7070f951e8fbcf48f7cb13f12777",
			integrity:
				"sha256:6a6f9c2f84fcb56af6dcaaf7af66c74d4d2e7070f951e8fbcf48f7cb13f12777",
			capabilities: [
				{
					portId: "notifications.send",
					portVersion: "1.0.0",
					contractHash:
						"0f8f7ea8a9d837f76f16fdb5bf8f95d727ec4fdd6d8f45f0c6bf3d9c7d17d2cf",
				},
			],
			metadata: {
				displayName: "Memory Notifications",
				tags: ["memory"],
			},
		},
	});
	if (!published.ok) {
		throw new Error("Failed to seed listing state");
	}
	return published.state;
};

const createTrustDecision = () => {
	const trustResult = trustContracts.verifyReleaseTrust({
		subject: {
			subjectType: "release",
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
				algorithm: "ed25519",
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
					algorithm: "ed25519",
					signature: "sig:builder-signature",
					signedArtifactHash:
						"6a6f9c2f84fcb56af6dcaaf7af66c74d4d2e7070f951e8fbcf48f7cb13f12777",
					issuedAt: "2026-02-28T10:05:00.000Z",
				},
			},
		],
		certificationStatus: "certified",
		revoked: false,
		mode: "production",
		policy: {
			profileId: "baseline-1.0.0",
		},
		evaluatedAt: "2026-02-28T10:10:00.000Z",
	});
	if (!trustResult.ok) {
		throw new Error("failed to create trust decision");
	}
	return trustResult.report;
};

describe("@gooi/app-marketplace certification", () => {
	test("maintains semantic parity for certification start/complete flows", () => {
		const listingState = seedListingState();
		const startInput = {
			listingState,
			certificationState: {
				records: [],
				auditLog: [],
			},
			actorId: "certifier:bot",
			occurredAt: "2026-02-28T11:00:00.000Z",
			providerId: "gooi.providers.memory",
			providerVersion: "1.0.0",
			profileId: "baseline-1.0.0",
		};
		const facadeStart = startMarketplaceCertification(startInput);
		const baselineStart = certificationContracts.startCertification(startInput);
		expect(JSON.stringify(facadeStart)).toBe(JSON.stringify(baselineStart));
		expect(facadeStart.ok).toBe(true);
		if (!facadeStart.ok) {
			return;
		}
		const policy =
			certificationContracts.certificationPolicyProfileSchema.parse({
				profileId: "baseline-1.0.0",
				requiredEvidenceKinds: ["conformance_report"],
			});

		const completeInput = {
			listingState,
			certificationState: facadeStart.state,
			actorId: "certifier:bot",
			occurredAt: "2026-02-28T12:00:00.000Z",
			providerId: "gooi.providers.memory",
			providerVersion: "1.0.0",
			policy,
			trustDecision: createTrustDecision(),
			evidence: [
				{
					kind: "conformance_report" as const,
					artifactHash:
						"6a6f9c2f84fcb56af6dcaaf7af66c74d4d2e7070f951e8fbcf48f7cb13f12777",
					artifactUri: "reports/conformance.json",
					collectedAt: "2026-02-28T11:30:00.000Z",
				},
			],
			report: {
				outcome: "pass" as const,
				profileId: "baseline-1.0.0",
				failures: [],
			},
		};
		const facadeComplete = completeMarketplaceCertification(completeInput);
		const baselineComplete =
			certificationContracts.completeCertification(completeInput);
		expect(JSON.stringify(facadeComplete)).toBe(
			JSON.stringify(baselineComplete),
		);
		expect(facadeComplete.ok).toBe(true);
		if (!facadeComplete.ok) {
			return;
		}
		expect(facadeComplete.record.status).toBe("certified");
	});
});
