import { describe, expect, test } from "bun:test";
import { catalogContracts } from "../src/catalog/contracts";
import { listingContracts } from "../src/listing/contracts";

const seedCatalogState = () => {
	const publishedV1 = listingContracts.publishListing({
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
				displayName: "Memory Notifications v1",
				tags: ["memory"],
			},
		},
	});
	if (!publishedV1.ok) {
		throw new Error("Failed to seed V1 listing");
	}
	const publishedV11 = listingContracts.publishListing({
		state: publishedV1.state,
		actorId: "publisher:alice",
		occurredAt: "2026-02-28T11:00:00.000Z",
		namespaceApprovals: ["gooi"],
		release: {
			...publishedV1.listing,
			providerVersion: "1.1.0",
			contentHash:
				"fb0e8c460935d98d0e4045afe65c123ec9de42fb0a5d2d3f7ac7a7491229f00a",
			integrity:
				"sha256:fb0e8c460935d98d0e4045afe65c123ec9de42fb0a5d2d3f7ac7a7491229f00a",
			metadata: {
				displayName: "Memory Notifications v1.1",
				tags: ["memory", "stable"],
			},
		},
	});
	if (!publishedV11.ok) {
		throw new Error("Failed to seed V1.1 listing");
	}
	const deprecatedV1 = listingContracts.deprecateListing({
		state: publishedV11.state,
		actorId: "publisher:alice",
		occurredAt: "2026-02-28T12:00:00.000Z",
		providerId: "gooi.providers.memory",
		providerVersion: "1.0.0",
		reason: "superseded",
	});
	if (!deprecatedV1.ok) {
		throw new Error("Failed to deprecate V1 listing");
	}
	return deprecatedV1.state;
};

describe("catalog", () => {
	test("searches catalog deterministically for fixed state", () => {
		const state = seedCatalogState();
		const result = catalogContracts.searchCatalog({
			state,
			query: {
				status: "active",
				providerNamespace: "gooi",
				limit: 10,
				offset: 0,
			},
		});
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.result.total).toBe(1);
		expect(result.result.items[0]?.providerVersion).toBe("1.1.0");

		const repeat = catalogContracts.searchCatalog({
			state,
			query: {
				status: "active",
				providerNamespace: "gooi",
				limit: 10,
				offset: 0,
			},
		});
		expect(repeat).toStrictEqual(result);
	});

	test("returns deterministic typed detail lookups", () => {
		const state = seedCatalogState();
		const hit = catalogContracts.getCatalogDetail({
			state,
			providerId: "gooi.providers.memory",
			providerVersion: "1.1.0",
		});
		expect(hit.ok).toBe(true);
		if (!hit.ok) {
			return;
		}
		expect(hit.item.metadata.displayName).toBe("Memory Notifications v1.1");

		const miss = catalogContracts.getCatalogDetail({
			state,
			providerId: "gooi.providers.memory",
			providerVersion: "9.9.9",
		});
		expect(miss.ok).toBe(false);
		if (miss.ok) {
			return;
		}
		expect(miss.error.code).toBe("catalog_not_found_error");
	});

	test("exports stable snapshot identity/hash for mirror paths", () => {
		const state = seedCatalogState();
		const activeOnly = catalogContracts.exportCatalogSnapshot({
			state,
			mirrorId: "enterprise-west",
			includeDeprecated: false,
		});
		expect(activeOnly.ok).toBe(true);
		if (!activeOnly.ok) {
			return;
		}
		expect(activeOnly.snapshot.listingCount).toBe(1);
		expect(activeOnly.snapshot.mirrorPath).toBe(
			`snapshots/enterprise-west/${activeOnly.snapshot.snapshotHash}.json`,
		);
		expect(activeOnly.snapshot.snapshotId).toBe(
			`enterprise-west:${activeOnly.snapshot.snapshotHash}`,
		);

		const repeat = catalogContracts.exportCatalogSnapshot({
			state,
			mirrorId: "enterprise-west",
			includeDeprecated: false,
		});
		expect(repeat).toStrictEqual(activeOnly);

		const withDeprecated = catalogContracts.exportCatalogSnapshot({
			state,
			mirrorId: "enterprise-west",
			includeDeprecated: true,
		});
		expect(withDeprecated.ok).toBe(true);
		if (!withDeprecated.ok) {
			return;
		}
		expect(withDeprecated.snapshot.listingCount).toBe(2);
		expect(withDeprecated.snapshot.snapshotHash).not.toBe(
			activeOnly.snapshot.snapshotHash,
		);
	});
});
