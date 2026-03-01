import { describe, expect, test } from "bun:test";
import { dispatchAndBindSurfaceIngress } from "../src/engine";
import {
	createSurfaceIngressDispatchPlansFixture,
	surfaceIngressBindingsFixture,
	surfaceIngressEntrypointsFixture,
	surfaceIngressFixtureBySurface,
} from "./fixtures/surface-ingress.fixture";

describe("surface-runtime ingress adapters", () => {
	test("normalizes web/http/cli/webhook ingress to one canonical bound payload", () => {
		const dispatchPlans = createSurfaceIngressDispatchPlansFixture();
		const expectedInvocationHostBySurface = {
			http: "node",
			web: "browser",
			cli: "node",
			webhook: "node",
		} as const;
		const results: ReturnType<typeof dispatchAndBindSurfaceIngress>[] = [];
		const expected = {
			page: 2,
			page_size: 10,
			q: "hello",
			show_deleted: false,
		};
		for (const [surfaceId, ingress] of Object.entries(
			surfaceIngressFixtureBySurface,
		)) {
			const result = dispatchAndBindSurfaceIngress({
				surfaceId,
				ingress,
				dispatchPlans,
				entrypoints: surfaceIngressEntrypointsFixture,
				bindings: surfaceIngressBindingsFixture,
			});
			results.push(result);
			if (!result.ok) {
				continue;
			}
			expect(result.boundInput).toEqual(expected);
			expect(result.surfaceId).toBe(result.dispatch.surfaceId);
			expect(result.surfaceId).toBe(surfaceId);
			const expectedHost =
				expectedInvocationHostBySurface[
					surfaceId as keyof typeof expectedInvocationHostBySurface
				];
			expect(result.invocationHost).toBe(expectedHost);
			expect(result.dispatch.entrypointKind).toBe("query");
			expect(result.dispatch.entrypointId).toBe("list_messages");
			expect(result.principal?.subject).toBe("user_1");
			expect(result.authContext?.provider).toBe("fixture");
		}
		expect(results.every((result) => result.ok)).toBe(true);
	});

	test("returns typed transport error when webhook verification fails", () => {
		const result = dispatchAndBindSurfaceIngress({
			surfaceId: "webhook",
			ingress: {
				verified: false,
				sourceId: "messages.source",
				method: "POST",
				path: "/messages/hooks",
				body: { page: "2", q: "hello" },
			},
			dispatchPlans: createSurfaceIngressDispatchPlansFixture(),
			entrypoints: surfaceIngressEntrypointsFixture,
			bindings: surfaceIngressBindingsFixture,
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("dispatch_transport_error");
		}
	});

	test("returns typed transport error when no adapter is registered", () => {
		const result = dispatchAndBindSurfaceIngress({
			surfaceId: "custom",
			ingress: {},
			dispatchPlans: createSurfaceIngressDispatchPlansFixture(),
			entrypoints: surfaceIngressEntrypointsFixture,
			bindings: surfaceIngressBindingsFixture,
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("dispatch_transport_error");
		}
	});

	test("returns typed transport error when auth context is malformed", () => {
		const result = dispatchAndBindSurfaceIngress({
			surfaceId: "http",
			ingress: {
				method: "GET",
				path: "/messages",
				query: { page: "2", q: "hello" },
				principal: "invalid",
			},
			dispatchPlans: createSurfaceIngressDispatchPlansFixture(),
			entrypoints: surfaceIngressEntrypointsFixture,
			bindings: surfaceIngressBindingsFixture,
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("dispatch_transport_error");
		}
	});

	test("returns typed transport error when invocationHost is malformed", () => {
		const result = dispatchAndBindSurfaceIngress({
			surfaceId: "http",
			ingress: {
				method: "GET",
				path: "/messages",
				query: { page: "2", q: "hello" },
				invocationHost: "datacenter",
			},
			dispatchPlans: createSurfaceIngressDispatchPlansFixture(),
			entrypoints: surfaceIngressEntrypointsFixture,
			bindings: surfaceIngressBindingsFixture,
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("dispatch_transport_error");
		}
	});

	test("returns typed transport error when principal fails dispatch contract validation", () => {
		const result = dispatchAndBindSurfaceIngress({
			surfaceId: "http",
			ingress: {
				method: "GET",
				path: "/messages",
				query: { page: "2", q: "hello" },
				principal: {
					subject: "user_1",
				},
			},
			dispatchPlans: createSurfaceIngressDispatchPlansFixture(),
			entrypoints: surfaceIngressEntrypointsFixture,
			bindings: surfaceIngressBindingsFixture,
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("dispatch_transport_error");
		}
	});
});
