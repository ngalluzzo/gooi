import { listingContracts } from "../../src/listing/contracts";
import { trustContracts } from "../../src/trust/contracts";

export const emptyCertificationState = {
	records: [],
	auditLog: [],
};

export const seedListingState = () => {
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

export const createTrustDecision = () => {
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
		throw new Error("Failed to create trust decision");
	}
	return trustResult.report;
};
