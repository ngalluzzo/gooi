import { describe, expect, test } from "bun:test";
import {
	parseCompiledSurfaceDispatchPlanSet,
	parseDispatchRequest,
} from "../src/dispatch/contracts";
import { parseDispatchError } from "../src/dispatch/error/contracts";
import { parseDispatchTraceEnvelope } from "../src/dispatch/trace/dispatch-trace";
import { envelope } from "../src/envelope/contracts";
import { request } from "../src/request/contracts";

describe("surface-contracts", () => {
	test("parses a native surface request payload", () => {
		const parsed = request.parseSurfaceRequestPayload({
			query: { page: "2" },
			path: { id: "msg_1" },
		});

		expect(parsed.query?.page).toBe("2");
		expect(parsed.path?.id).toBe("msg_1");
	});

	test("parses dispatch plan, request, and trace contracts", () => {
		const planSet = parseCompiledSurfaceDispatchPlanSet({
			artifactVersion: "1.0.0",
			plans: {
				http: {
					surfaceId: "http",
					handlers: [
						{
							handlerId: "http:query:list_messages",
							surfaceId: "http",
							matcher: {
								surfaceType: "http",
								clauses: [
									{
										key: "method",
										op: "eq",
										value: "GET",
									},
									{
										key: "path",
										op: "path_template",
										value: "/messages",
									},
								],
							},
							specificity: 36,
							target: {
								entrypointKind: "query",
								entrypointId: "list_messages",
								fieldBindings: {
									page: "query.page",
								},
							},
						},
					],
				},
			},
		});
		const request = parseDispatchRequest({
			surfaceType: "http",
			surfaceId: "http",
			attributes: {
				method: "get",
				path: "/messages",
			},
		});
		const trace = parseDispatchTraceEnvelope({
			surfaceId: "http",
			candidates: planSet.plans.http?.handlers ?? [],
			selectedHandlerId: "http:query:list_messages",
			steps: [
				{
					handlerId: "http:query:list_messages",
					decision: "winner_selected",
					reason: "Highest specificity match.",
				},
			],
		});

		expect(request.attributes.method).toBe("get");
		expect(trace.selectedHandlerId).toBe("http:query:list_messages");
	});

	test("parses typed dispatch error payload", () => {
		const parsed = parseDispatchError({
			code: "dispatch_not_found_error",
			message: "No handler matched the incoming request.",
			details: {
				surfaceId: "http",
			},
		});
		expect(parsed.code).toBe("dispatch_not_found_error");
	});

	test("parses invocation, signal, and result envelopes", () => {
		const invocation = envelope.parseInvocationEnvelope({
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

		const signal = envelope.parseSignalEnvelope({
			envelopeVersion: "1.0.0",
			signalId: "messages.updated",
			signalVersion: 1,
			payloadHash: "hash_1",
			emittedAt: "2026-02-26T00:00:00.000Z",
		});

		const result = envelope.parseResultEnvelope({
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
