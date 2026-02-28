import type { RunMarketplaceControlPlaneConformanceInput } from "../../src/marketplace-control-plane-conformance/contracts";

const baseFixture = {
	contractVersion: "1.0.0",
	fixtureId: "marketplace-control-plane-baseline",
	laneId: "L3",
	fixtureHash:
		"6a6f9c2f84fcb56af6dcaaf7af66c74d4d2e7070f951e8fbcf48f7cb13f12777",
	artifactHashes: {
		listing: "6a6f9c2f84fcb56af6dcaaf7af66c74d4d2e7070f951e8fbcf48f7cb13f12777",
		catalog: "fb0e8c460935d98d0e4045afe65c123ec9de42fb0a5d2d3f7ac7a7491229f00a",
		certification:
			"0f8f7ea8a9d837f76f16fdb5bf8f95d727ec4fdd6d8f45f0c6bf3d9c7d17d2cf",
	},
} as const;

const createInput = (): RunMarketplaceControlPlaneConformanceInput => ({
	fixture: baseFixture,
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
			summary: "Reference provider",
			tags: ["notifications", "memory", "notifications"],
		},
	},
	updatedMetadata: {
		displayName: "Memory Notifications Updated",
		tags: ["memory", "stable"],
	},
	descriptorIndex: {
		"gooi.providers.memory@1.0.0": {
			descriptorVersion: "1.0.0",
			requiredHostApiVersion: "1.0.0",
			supportedHosts: ["node"],
			capabilities: [
				{
					portId: "notifications.send",
					portVersion: "1.0.0",
					mode: "local",
					targetHost: "node",
				},
			],
			delegationRoutes: [],
		},
	},
	catalogMirrorId: "enterprise-west",
	publishOccurredAt: "2026-02-28T10:00:00.000Z",
	updateOccurredAt: "2026-02-28T11:00:00.000Z",
	deprecateOccurredAt: "2026-02-28T12:00:00.000Z",
	certificationStartedAt: "2026-02-28T12:05:00.000Z",
	certificationCompletedAt: "2026-02-28T12:10:00.000Z",
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
	certificationTrustDecision: {
		subject: {
			subjectType: "release",
			subjectId: "gooi.providers.memory@1.0.0",
			providerId: "gooi.providers.memory",
			providerVersion: "1.0.0",
			namespace: "gooi",
		},
		profileId: "global-trust-1.0.0",
		mode: "certified",
		evaluatedAt: "2026-02-28T12:08:00.000Z",
		verified: true,
		verdict: "trusted",
		claims: [
			{
				claimId: "artifact.signature",
				value: "1",
				verified: true,
			},
			{
				claimId: "certification.status",
				value: "certified",
				verified: true,
			},
			{
				claimId: "provenance.attestation",
				value: "1",
				verified: true,
			},
			{
				claimId: "subject.id",
				value: "gooi.providers.memory@1.0.0",
				verified: true,
			},
		],
		reasons: [],
	},
});

export const createMarketplaceControlPlaneConformanceFixture = () =>
	createInput();

export const createMarketplaceControlPlaneConformancePolicyFailureFixture =
	() => {
		const fixture = createInput();
		const requiredEvidenceKinds: RunMarketplaceControlPlaneConformanceInput["certificationPolicy"]["requiredEvidenceKinds"] =
			["conformance_report", "security_scan", "provenance_attestation"];
		return {
			...fixture,
			certificationPolicy: {
				...fixture.certificationPolicy,
				requiredEvidenceKinds,
			},
		};
	};
