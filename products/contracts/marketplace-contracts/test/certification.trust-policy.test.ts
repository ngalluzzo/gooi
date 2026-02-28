import { describe, expect, test } from "bun:test";
import { certificationContracts } from "../src/certification/contracts";
import {
	emptyCertificationState,
	seedListingState,
} from "./fixtures/certification.fixture";

describe("certification trust policy", () => {
	test("blocks certification completion when required trust decision is missing", () => {
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
				outcome: "pass",
				profileId: "baseline-1.0.0",
				failures: [],
			},
		});

		expect(completed.ok).toBe(false);
		if (completed.ok) {
			return;
		}
		expect(completed.error.code).toBe("certification_policy_error");
	});
});
