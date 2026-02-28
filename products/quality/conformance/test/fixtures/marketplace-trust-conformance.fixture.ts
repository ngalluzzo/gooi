import type { VerifyReleaseTrustInput } from "@gooi/marketplace-contracts/trust";
import type { RunMarketplaceTrustConformanceInput } from "../../src/marketplace-trust-conformance/contracts";

const eligibilityReport = {
	query: {
		portId: "notifications.send",
		portVersion: "1.0.0",
		hostApiVersion: "1.0.0",
	},
	requiredCertifications: ["soc2"],
	providers: [
		{
			providerId: "gooi.providers.memory",
			providerVersion: "1.2.3",
			integrity:
				"sha256:6a6f9c2f84fcb56af6dcaaf7af66c74d4d2e7070f951e8fbcf48f7cb13f12777",
			reachability: {
				mode: "local" as const,
				targetHost: "node" as const,
			},
			status: "eligible" as const,
			reasons: [],
			missingCertifications: [],
			compatibility: {
				requiredHostApiVersion: "1.0.0",
				actualHostApiVersion: "1.0.0",
				hostApiCompatible: true,
				capabilityCompatible: true,
				contractHashCompatible: true,
			},
			trust: {
				tier: "trusted" as const,
				certifications: ["soc2"],
				meetsMinimumTier: true,
			},
		},
		{
			providerId: "gooi.providers.http",
			providerVersion: "2.1.0",
			integrity:
				"sha256:fb0e8c460935d98d0e4045afe65c123ec9de42fb0a5d2d3f7ac7a7491229f00a",
			reachability: {
				mode: "delegated" as const,
				targetHost: "node" as const,
				delegateRouteId: "route-node-1",
				delegateDescriptor: "https://gooi.dev/delegation/route-node-1",
			},
			status: "eligible" as const,
			reasons: [],
			missingCertifications: [],
			compatibility: {
				requiredHostApiVersion: "1.0.0",
				actualHostApiVersion: "1.0.0",
				hostApiCompatible: true,
				capabilityCompatible: true,
				contractHashCompatible: true,
			},
			trust: {
				tier: "review" as const,
				certifications: ["soc2"],
				meetsMinimumTier: true,
			},
		},
	],
	summary: {
		totalProviders: 2,
		eligibleProviders: 2,
		ineligibleProviders: 0,
	},
};

const failClosedModes: VerifyReleaseTrustInput["policy"]["failClosedModes"] = [
	"certified",
	"production",
];

const memoryTrustInput: VerifyReleaseTrustInput = {
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
		failClosedModes,
		requireCertifiedStatusInFailClosedModes: true,
	},
	evaluatedAt: "2026-02-28T10:10:00.000Z",
};

const revokedTrustInput: VerifyReleaseTrustInput = {
	...memoryTrustInput,
	subject: {
		subjectType: "release" as const,
		subjectId: "gooi.providers.http@2.1.0",
		providerId: "gooi.providers.http",
		providerVersion: "2.1.0",
		namespace: "gooi",
	},
	policy: {
		...memoryTrustInput.policy,
		requiredSubjectIds: ["gooi.providers.http@2.1.0"],
	},
	revoked: true,
};

const createInput = (): RunMarketplaceTrustConformanceInput => ({
	actorId: "marketplace:operator",
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
	publishOccurredAt: "2026-02-28T10:00:00.000Z",
	certificationStartedAt: "2026-02-28T11:00:00.000Z",
	certificationCompletedAt: "2026-02-28T12:00:00.000Z",
	certificationPolicy: {
		profileId: "baseline-1.0.0",
		requiredEvidenceKinds: ["conformance_report", "security_scan"],
		trust: {
			required: true,
			requiredVerdict: "trusted",
			requiredClaimIds: [],
		},
	},
	certificationEvidence: [
		{
			kind: "security_scan",
			artifactHash:
				"fb0e8c460935d98d0e4045afe65c123ec9de42fb0a5d2d3f7ac7a7491229f00a",
			artifactUri: "reports/security.json",
			collectedAt: "2026-02-28T11:30:00.000Z",
		},
		{
			kind: "conformance_report",
			artifactHash:
				"6a6f9c2f84fcb56af6dcaaf7af66c74d4d2e7070f951e8fbcf48f7cb13f12777",
			artifactUri: "reports/conformance.json",
			collectedAt: "2026-02-28T11:15:00.000Z",
		},
	],
	certificationReport: {
		outcome: "pass",
		profileId: "baseline-1.0.0",
		failures: [],
	},
	trustVerificationInput: memoryTrustInput,
	revokedTrustVerificationInput: revokedTrustInput,
	certificationMissingFailClosedInput: {
		...memoryTrustInput,
		certificationStatus: "pending",
	},
	revocationPublishInput: {
		ledger: { events: [], lastSequence: 0 },
		actorId: "security:operator",
		occurredAt: "2026-02-28T12:00:00.000Z",
		action: "revoke",
		providerId: "gooi.providers.http",
		providerVersion: "2.1.0",
		reason: "incident",
		replayKey: "incident-118",
	},
	resolutionRevocationInput: {
		report: eligibilityReport,
		maxResults: 2,
		requireEligible: false,
		explainabilityMode: "diagnostics",
		revocation: {
			lastSyncedAt: "2026-02-28T12:00:00.000Z",
			evaluatedAt: "2026-02-28T12:01:00.000Z",
			maxStalenessSeconds: 120,
			revokedProviderRefs: [],
		},
	},
	resolutionStaleRevocationInput: {
		report: eligibilityReport,
		maxResults: 1,
		revocation: {
			lastSyncedAt: "2026-02-28T12:00:00.000Z",
			evaluatedAt: "2026-02-28T12:10:01.000Z",
			maxStalenessSeconds: 300,
			revokedProviderRefs: [],
		},
	},
});

export const createMarketplaceTrustConformanceFixture = () => createInput();

export const createMarketplaceTrustConformanceRevocationMismatchFixture =
	() => {
		const fixture = createInput();
		return {
			...fixture,
			revokedTrustVerificationInput: {
				...fixture.revokedTrustVerificationInput,
				revoked: false,
			},
		};
	};
