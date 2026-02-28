import { describe, expect, test } from "bun:test";
import { certificationContracts } from "../src/certification/contracts";
import { listingContracts } from "../src/listing/contracts";

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

const emptyCertificationState = {
	records: [],
	auditLog: [],
};

describe("certification", () => {
	test("starts certification only for existing listing releases", () => {
		const listingState = seedListingState();
		const started = certificationContracts.startCertification({
			listingState,
			certificationState: emptyCertificationState,
			actorId: "certifier:bot",
			occurredAt: "2026-02-28T11:00:00.000Z",
			providerId: "gooi.providers.memory",
			providerVersion: "1.0.0",
			profileId: "baseline-1.0.0",
		});

		expect(started.ok).toBe(true);
		if (!started.ok) {
			return;
		}
		expect(started.record.status).toBe("pending");
		expect(started.auditEvent?.sequence).toBe(1);
		expect(started.state.records).toHaveLength(1);
	});

	test("completes certification with deterministic evidence linkage", () => {
		const listingState = seedListingState();
		const started = certificationContracts.startCertification({
			listingState,
			certificationState: emptyCertificationState,
			actorId: "certifier:bot",
			occurredAt: "2026-02-28T11:00:00.000Z",
			providerId: "gooi.providers.memory",
			providerVersion: "1.0.0",
			profileId: "baseline-1.0.0",
		});
		expect(started.ok).toBe(true);
		if (!started.ok) {
			return;
		}

		const completed = certificationContracts.completeCertification({
			listingState,
			certificationState: started.state,
			actorId: "certifier:bot",
			occurredAt: "2026-02-28T12:00:00.000Z",
			providerId: "gooi.providers.memory",
			providerVersion: "1.0.0",
			policy: {
				profileId: "baseline-1.0.0",
				requiredEvidenceKinds: ["conformance_report", "security_scan"],
			},
			evidence: [
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
			report: {
				outcome: "pass",
				profileId: "baseline-1.0.0",
				failures: [],
			},
		});
		expect(completed.ok).toBe(true);
		if (!completed.ok) {
			return;
		}
		expect(completed.record.status).toBe("certified");
		expect(completed.record.evidence[0]?.kind).toBe("conformance_report");
		expect(completed.auditEvent?.sequence).toBe(2);
	});

	test("stores typed rejection reports for failed certification paths", () => {
		const listingState = seedListingState();
		const started = certificationContracts.startCertification({
			listingState,
			certificationState: emptyCertificationState,
			actorId: "certifier:bot",
			occurredAt: "2026-02-28T11:00:00.000Z",
			providerId: "gooi.providers.memory",
			providerVersion: "1.0.0",
			profileId: "baseline-1.0.0",
		});
		expect(started.ok).toBe(true);
		if (!started.ok) {
			return;
		}
		const completed = certificationContracts.completeCertification({
			listingState,
			certificationState: started.state,
			actorId: "certifier:bot",
			occurredAt: "2026-02-28T12:00:00.000Z",
			providerId: "gooi.providers.memory",
			providerVersion: "1.0.0",
			policy: {
				profileId: "baseline-1.0.0",
				requiredEvidenceKinds: ["conformance_report"],
			},
			evidence: [
				{
					kind: "conformance_report",
					artifactHash:
						"6a6f9c2f84fcb56af6dcaaf7af66c74d4d2e7070f951e8fbcf48f7cb13f12777",
					artifactUri: "reports/conformance.json",
					collectedAt: "2026-02-28T11:15:00.000Z",
				},
			],
			report: {
				outcome: "fail",
				profileId: "baseline-1.0.0",
				failures: [
					{
						code: "security_failure",
						message: "Static analysis found critical vulnerabilities.",
					},
				],
			},
		});
		expect(completed.ok).toBe(true);
		if (!completed.ok) {
			return;
		}
		expect(completed.record.status).toBe("rejected");
		expect(completed.record.report?.failures[0]?.code).toBe("security_failure");
	});
});
