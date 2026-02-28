import { describe, expect, test } from "bun:test";
import { certificationContracts } from "../src/certification/contracts";
import { listingContracts } from "../src/listing/contracts";

describe("app-marketplace-facade-contracts certification", () => {
	test("exposes canonical certification workflow wrappers", () => {
		const listing = listingContracts.publishMarketplaceListing({
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
						portId: "ids.generate",
						portVersion: "1.0.0",
						contractHash:
							"0f8f7ea8a9d837f76f16fdb5bf8f95d727ec4fdd6d8f45f0c6bf3d9c7d17d2cf",
					},
				],
				metadata: {
					displayName: "Memory IDs",
					tags: ["ids"],
				},
			},
		});
		expect(listing.ok).toBe(true);
		if (!listing.ok) {
			return;
		}

		const started = certificationContracts.startMarketplaceCertification({
			listingState: listing.state,
			certificationState: {
				records: [],
				auditLog: [],
			},
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
	});
});
