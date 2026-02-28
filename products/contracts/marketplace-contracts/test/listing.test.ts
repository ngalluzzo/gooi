import { describe, expect, test } from "bun:test";
import { listingContracts } from "../src/listing/contracts";

const initialState = {
	listings: [],
	auditLog: [],
} as const;

const baseRelease = {
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
} as const;

const publishInput = (overrides?: Record<string, unknown>) => ({
	state: initialState,
	actorId: "publisher:alice",
	occurredAt: "2026-02-28T10:00:00.000Z",
	namespaceApprovals: ["gooi"],
	release: baseRelease,
	...(overrides ?? {}),
});

describe("listing", () => {
	test("enforces namespace-approval policy for initial 1.0.0 onboarding", () => {
		const result = listingContracts.publishListing(
			publishInput({ namespaceApprovals: [] }),
		);

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.error.code).toBe("listing_policy_error");
	});

	test("publishes deterministically and records audit events", () => {
		const result = listingContracts.publishListing(publishInput());
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.listing.status).toBe("active");
		expect(result.listing.metadata.tags).toEqual(["memory", "notifications"]);
		expect(result.auditEvent?.sequence).toBe(1);
		expect(result.state.auditLog).toHaveLength(1);

		const update = listingContracts.updateListing({
			state: result.state,
			actorId: "publisher:alice",
			occurredAt: "2026-02-28T11:00:00.000Z",
			providerId: baseRelease.providerId,
			providerVersion: baseRelease.providerVersion,
			metadata: {
				displayName: "Memory Notifications Updated",
				tags: ["memory"],
			},
		});
		expect(update.ok).toBe(true);
		if (!update.ok) {
			return;
		}
		expect(update.auditEvent?.sequence).toBe(2);
		expect(update.state.auditLog).toHaveLength(2);

		const deprecate = listingContracts.deprecateListing({
			state: update.state,
			actorId: "publisher:alice",
			occurredAt: "2026-02-28T12:00:00.000Z",
			providerId: baseRelease.providerId,
			providerVersion: baseRelease.providerVersion,
			reason: "superseded",
		});
		expect(deprecate.ok).toBe(true);
		if (!deprecate.ok) {
			return;
		}
		expect(deprecate.listing.status).toBe("deprecated");
		expect(deprecate.auditEvent?.sequence).toBe(3);
		expect(deprecate.state.auditLog).toHaveLength(3);
	});

	test("returns typed conflict errors when immutable publish data changes", () => {
		const first = listingContracts.publishListing(publishInput());
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}

		const conflict = listingContracts.publishListing({
			...publishInput(),
			state: first.state,
			release: {
				...baseRelease,
				contentHash:
					"fb0e8c460935d98d0e4045afe65c123ec9de42fb0a5d2d3f7ac7a7491229f00a",
			},
		});
		expect(conflict.ok).toBe(false);
		if (conflict.ok) {
			return;
		}
		expect(conflict.error.code).toBe("listing_conflict_error");
	});

	test("is deterministic for equivalent publish inputs", () => {
		const first = listingContracts.publishListing(publishInput());
		const second = listingContracts.publishListing(publishInput());

		expect(first).toStrictEqual(second);
		expect(JSON.stringify(first)).toBe(JSON.stringify(second));
	});
});
