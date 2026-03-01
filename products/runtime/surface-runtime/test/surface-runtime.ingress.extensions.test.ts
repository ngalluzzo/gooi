import { describe, expect, test } from "bun:test";
import type { CompiledSurfaceDispatchPlanSet } from "@gooi/surface-contracts/dispatch";
import {
	createSurfaceAdapterRegistry,
	defaultSurfaceAdapters,
	dispatchAndBindSurfaceIngress,
} from "../src/engine";
import {
	surfaceIngressBindingsFixture,
	surfaceIngressEntrypointsFixture,
} from "./fixtures/surface-ingress.fixture";

describe("surface-runtime ingress adapter extensions", () => {
	test("supports intent-only web ingress for derived web matcher policies", () => {
		const result = dispatchAndBindSurfaceIngress({
			surfaceId: "web",
			ingress: {
				intent: "list_messages",
				query: { page: "2", q: "hello" },
				principal: {
					subject: "user_1",
					claims: {},
					tags: ["authenticated"],
				},
				authContext: {
					provider: "fixture",
				},
			},
			dispatchPlans: {
				artifactVersion: "1.0.0",
				plans: {
					web: {
						surfaceId: "web",
						handlers: [
							{
								handlerId: "web:query:list_messages",
								surfaceId: "web",
								matcher: {
									surfaceType: "web",
									clauses: [
										{ key: "intent", op: "eq", value: "list_messages" },
									],
								},
								specificity: 100,
								target: {
									entrypointKind: "query",
									entrypointId: "list_messages",
									fieldBindings: {},
								},
							},
						],
					},
				},
			},
			entrypoints: surfaceIngressEntrypointsFixture,
			bindings: surfaceIngressBindingsFixture,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.dispatch.entrypointKind).toBe("query");
		expect(result.dispatch.entrypointId).toBe("list_messages");
		expect(result.boundInput).toEqual({
			page: 2,
			page_size: 10,
			q: "hello",
			show_deleted: false,
		});
	});

	test("scales via adapter registry plugins without dispatch core changes", () => {
		const dispatchPlans: CompiledSurfaceDispatchPlanSet = {
			artifactVersion: "1.0.0",
			plans: {
				chat: {
					surfaceId: "chat",
					handlers: [
						{
							handlerId: "chat:query:list_messages",
							surfaceId: "chat",
							matcher: {
								surfaceType: "chat",
								clauses: [{ key: "intent", op: "eq", value: "list_messages" }],
							},
							specificity: 100,
							target: {
								entrypointKind: "query",
								entrypointId: "list_messages",
								fieldBindings: {},
							},
						},
					],
				},
			},
		};
		const registry = createSurfaceAdapterRegistry([
			...defaultSurfaceAdapters,
			{
				surfaceType: "chat",
				normalize: (ingress) => {
					const record =
						ingress !== null && typeof ingress === "object"
							? (ingress as Readonly<Record<string, unknown>>)
							: null;
					if (record === null || typeof record.intent !== "string") {
						return {
							ok: false as const,
							error: {
								code: "dispatch_transport_error" as const,
								message: "Chat ingress requires intent.",
							},
						};
					}
					return {
						ok: true as const,
						value: {
							surfaceType: "chat",
							invocationHost: "node",
							attributes: { intent: record.intent },
							...(record.body !== null && typeof record.body === "object"
								? {
										payload: {
											body: record.body as Readonly<Record<string, unknown>>,
										},
									}
								: {}),
						},
					};
				},
			},
		]);
		const result = dispatchAndBindSurfaceIngress({
			surfaceId: "chat",
			ingress: {
				intent: "list_messages",
				body: { page: "3", q: "plugin" },
			},
			dispatchPlans,
			entrypoints: surfaceIngressEntrypointsFixture,
			bindings: {
				"chat:query:list_messages": {
					surfaceId: "chat",
					entrypointKind: "query",
					entrypointId: "list_messages",
					fieldBindings: {
						page: "body.page",
						q: "body.q",
					},
				},
			},
			adapterRegistry: registry,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.boundInput).toEqual({
			page: 3,
			page_size: 10,
			q: "plugin",
			show_deleted: false,
		});
	});
});
