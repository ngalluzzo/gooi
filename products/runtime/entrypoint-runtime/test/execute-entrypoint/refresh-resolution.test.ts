import { describe, expect, test } from "bun:test";
import {
	buildRefreshTriggers,
	resolveAffectedQueryIds,
} from "../../src/refresh/refresh";

describe("entrypoint-runtime refresh resolution", () => {
	test("builds canonical refresh triggers with deterministic deduplication", () => {
		const triggers = buildRefreshTriggers([
			{
				envelopeVersion: "1.0.0",
				signalId: "message.created",
				signalVersion: 1,
				payloadHash: "hash_1",
				emittedAt: "2026-02-27T00:00:00.000Z",
			},
			{
				envelopeVersion: "1.0.0",
				signalId: "message.created",
				signalVersion: 1,
				payloadHash: "hash_1",
				emittedAt: "2026-02-27T00:00:01.000Z",
			},
			{
				envelopeVersion: "1.0.0",
				signalId: "message.deleted",
				signalVersion: 1,
				payloadHash: "hash_2",
				emittedAt: "2026-02-27T00:00:02.000Z",
			},
		]);

		expect(triggers).toEqual([
			{
				signalId: "message.created",
				signalVersion: 1,
				payloadHash: "hash_1",
			},
			{
				signalId: "message.deleted",
				signalVersion: 1,
				payloadHash: "hash_2",
			},
		]);
	});

	test("resolves affected query ids in stable lexical order", () => {
		const queryIds = resolveAffectedQueryIds(
			{
				b: {
					queryId: "z_query",
					signalIds: ["message.deleted"],
				},
				a: {
					queryId: "a_query",
					signalIds: ["message.created", "message.deleted"],
				},
			},
			[
				{
					signalId: "message.deleted",
					signalVersion: 1,
					payloadHash: "hash_1",
				},
			],
		);

		expect(queryIds).toEqual(["a_query", "z_query"]);
	});
});
