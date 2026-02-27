import { describe, expect, test } from "bun:test";
import { parseInvocationEnvelope } from "../src/invocation-envelope/invocation-envelope";
import { parseResultEnvelope } from "../src/result-envelope/result-envelope";
import { parseSignalEnvelope } from "../src/signal-envelope/signal-envelope";
import { parseSurfaceRequestPayload } from "../src/surface-request/surface-request";

describe("surface-contracts", () => {
	test("parses a native surface request payload", () => {
		const parsed = parseSurfaceRequestPayload({
			query: { page: "2" },
			path: { id: "msg_1" },
		});

		expect(parsed.query?.page).toBe("2");
		expect(parsed.path?.id).toBe("msg_1");
	});

	test("parses invocation, signal, and result envelopes", () => {
		const invocation = parseInvocationEnvelope({
			envelopeVersion: "1.0.0",
			traceId: "trace_1",
			invocationId: "inv_1",
			entrypointId: "list_messages",
			entrypointKind: "query",
			principal: {
				subject: "user_1",
				claims: {},
				tags: [],
			},
			input: {},
			meta: {
				requestReceivedAt: "2026-02-26T00:00:00.000Z",
			},
		});

		const signal = parseSignalEnvelope({
			envelopeVersion: "1.0.0",
			signalId: "messages.updated",
			signalVersion: 1,
			payloadHash: "hash_1",
			emittedAt: "2026-02-26T00:00:00.000Z",
		});

		const result = parseResultEnvelope({
			envelopeVersion: "1.0.0",
			traceId: invocation.traceId,
			invocationId: invocation.invocationId,
			ok: true,
			output: { items: [] },
			emittedSignals: [signal],
			observedEffects: ["read"],
			timings: {
				startedAt: "2026-02-26T00:00:00.000Z",
				completedAt: "2026-02-26T00:00:01.000Z",
				durationMs: 1000,
			},
			meta: {
				replayed: false,
				artifactHash: "artifact_hash",
				affectedQueryIds: ["list_messages"],
				refreshTriggers: [
					{
						signalId: "messages.updated",
						signalVersion: 1,
						payloadHash: "hash_1",
					},
				],
			},
		});

		expect(result.ok).toBe(true);
		expect(result.emittedSignals).toHaveLength(1);
	});
});
