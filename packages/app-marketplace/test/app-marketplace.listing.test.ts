import { describe, expect, test } from "bun:test";
import { listingContracts } from "@gooi/marketplace-contracts/listing";
import {
	deprecateMarketplaceListing,
	publishMarketplaceListing,
	updateMarketplaceListing,
} from "../src/listing/manage-listing";

const publishInput = {
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
};

describe("@gooi/app-marketplace listing", () => {
	test("maintains semantic parity for listing lifecycle flows", () => {
		const facadePublish = publishMarketplaceListing(publishInput);
		const baselinePublish = listingContracts.publishListing(publishInput);
		expect(JSON.stringify(facadePublish)).toBe(JSON.stringify(baselinePublish));
		expect(facadePublish.ok).toBe(true);
		if (!facadePublish.ok) {
			return;
		}

		const updateInput = {
			state: facadePublish.state,
			actorId: "publisher:alice",
			occurredAt: "2026-02-28T11:00:00.000Z",
			providerId: "gooi.providers.memory",
			providerVersion: "1.0.0",
			metadata: {
				displayName: "Memory Notifications Updated",
				tags: ["memory", "updated"],
			},
		};
		const facadeUpdate = updateMarketplaceListing(updateInput);
		const baselineUpdate = listingContracts.updateListing(updateInput);
		expect(JSON.stringify(facadeUpdate)).toBe(JSON.stringify(baselineUpdate));
		expect(facadeUpdate.ok).toBe(true);
		if (!facadeUpdate.ok) {
			return;
		}

		const deprecateInput = {
			state: facadeUpdate.state,
			actorId: "publisher:alice",
			occurredAt: "2026-02-28T12:00:00.000Z",
			providerId: "gooi.providers.memory",
			providerVersion: "1.0.0",
			reason: "superseded",
		};
		const facadeDeprecate = deprecateMarketplaceListing(deprecateInput);
		const baselineDeprecate = listingContracts.deprecateListing(deprecateInput);

		expect(JSON.stringify(facadeDeprecate)).toBe(
			JSON.stringify(baselineDeprecate),
		);
		expect(facadeDeprecate.ok).toBe(true);
		if (!facadeDeprecate.ok) {
			return;
		}
		expect(facadeDeprecate.listing.status).toBe("deprecated");
	});

	test("preserves typed policy failure taxonomy", () => {
		const result = publishMarketplaceListing({
			...publishInput,
			namespaceApprovals: [],
		});
		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.error.code).toBe("listing_policy_error");
	});
});
