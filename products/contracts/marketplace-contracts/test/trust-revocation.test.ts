import { describe, expect, test } from "bun:test";
import { trustContracts } from "../src/trust/contracts";

describe("trust revocation", () => {
	test("publishes push revocation events and supports pull feed queries", () => {
		const published = trustContracts.publishTrustRevocation({
			ledger: {
				events: [],
				lastSequence: 0,
			},
			actorId: "security:operator",
			occurredAt: "2026-02-28T12:00:00.000Z",
			action: "revoke",
			providerId: "gooi.providers.http",
			providerVersion: "2.1.0",
			reason: "incident",
			replayKey: "incident-1",
		});

		expect(published.ok).toBe(true);
		if (!published.ok) {
			return;
		}
		expect(published.event.sequence).toBe(1);
		expect(published.ledger.lastSequence).toBe(1);

		const feed = trustContracts.pullTrustRevocationFeed({
			ledger: published.ledger,
			sinceSequence: 0,
			maxEvents: 10,
		});
		expect(feed.latestSequence).toBe(1);
		expect(feed.events).toHaveLength(1);
		expect(feed.events[0]?.providerId).toBe("gooi.providers.http");
	});

	test("is replay-safe for duplicate replay keys and rejects conflicting payload replays", () => {
		const first = trustContracts.publishTrustRevocation({
			ledger: {
				events: [],
				lastSequence: 0,
			},
			actorId: "security:operator",
			occurredAt: "2026-02-28T12:00:00.000Z",
			action: "revoke",
			providerId: "gooi.providers.http",
			providerVersion: "2.1.0",
			reason: "incident",
			replayKey: "incident-2",
		});
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}

		const duplicate = trustContracts.publishTrustRevocation({
			ledger: first.ledger,
			actorId: "security:operator",
			occurredAt: "2026-02-28T12:01:00.000Z",
			action: "revoke",
			providerId: "gooi.providers.http",
			providerVersion: "2.1.0",
			reason: "incident",
			replayKey: "incident-2",
		});
		expect(duplicate.ok).toBe(true);
		if (!duplicate.ok) {
			return;
		}
		expect(duplicate.event.sequence).toBe(first.event.sequence);
		expect(duplicate.ledger.events).toHaveLength(1);

		const conflicting = trustContracts.publishTrustRevocation({
			ledger: first.ledger,
			actorId: "security:operator",
			occurredAt: "2026-02-28T12:01:00.000Z",
			action: "restore",
			providerId: "gooi.providers.http",
			providerVersion: "2.1.0",
			reason: "incident cleared",
			replayKey: "incident-2",
		});
		expect(conflicting.ok).toBe(false);
		if (conflicting.ok) {
			return;
		}
		expect(conflicting.error.code).toBe("trust_policy_violation_error");
	});

	test("derives deterministic revoked provider refs from ordered event replay", () => {
		const events = [
			{
				sequence: 1,
				action: "revoke" as const,
				providerId: "gooi.providers.http",
				providerVersion: "2.1.0",
			},
			{
				sequence: 2,
				action: "revoke" as const,
				providerId: "gooi.providers.memory",
				providerVersion: "1.2.3",
			},
			{
				sequence: 3,
				action: "restore" as const,
				providerId: "gooi.providers.http",
				providerVersion: "2.1.0",
			},
		];

		const refs = trustContracts.deriveRevokedProviderRefs(events);
		expect(refs).toEqual(["gooi.providers.memory@1.2.3"]);
	});
});
