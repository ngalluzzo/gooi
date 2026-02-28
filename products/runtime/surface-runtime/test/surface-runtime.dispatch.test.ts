import { describe, expect, test } from "bun:test";
import {
	dispatchAndBindSurfaceInput,
	dispatchSurfaceRequest,
} from "../src/engine";
import {
	createAmbiguousDispatchPlanFixture,
	createDispatchPlanFixture,
	dispatchBindingsFixture,
	dispatchEntrypointsFixture,
	dispatchRequestFixture,
} from "./fixtures/surface-dispatch.fixture";

describe("surface-runtime dispatch", () => {
	test("chooses the most specific overlapping handler deterministically", () => {
		const result = dispatchSurfaceRequest({
			dispatchPlans: createDispatchPlanFixture(),
			request: dispatchRequestFixture,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.selection.handlerId).toBe("http:query:list_messages");
		expect(result.trace.selectedHandlerId).toBe("http:query:list_messages");
	});

	test("returns typed ambiguous error when top-ranked handlers tie", () => {
		const result = dispatchSurfaceRequest({
			dispatchPlans: createAmbiguousDispatchPlanFixture(),
			request: dispatchRequestFixture,
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("dispatch_ambiguous_error");
			expect(
				Array.isArray(
					(result.error.details as { readonly handlerIds?: unknown })
						?.handlerIds,
				),
			).toBe(true);
		}
	});

	test("resolves canonical entrypoint reference and returns typed bound payload", () => {
		const result = dispatchAndBindSurfaceInput({
			dispatchPlans: createDispatchPlanFixture(),
			request: dispatchRequestFixture,
			entrypoints: dispatchEntrypointsFixture,
			bindings: dispatchBindingsFixture,
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
			as_of: "2026-02-26T00:00:00.000Z",
			show_deleted: true,
		});
	});

	test("returns typed not-found and transport mismatch diagnostics", () => {
		const noMatch = dispatchSurfaceRequest({
			dispatchPlans: createDispatchPlanFixture(),
			request: {
				...dispatchRequestFixture,
				attributes: {
					...dispatchRequestFixture.attributes,
					path: "/unknown/path",
				},
			},
		});
		expect(noMatch.ok).toBe(false);
		if (!noMatch.ok) {
			expect(noMatch.error.code).toBe("dispatch_not_found_error");
		}

		const missingBinding = dispatchAndBindSurfaceInput({
			dispatchPlans: createDispatchPlanFixture(),
			request: dispatchRequestFixture,
			entrypoints: dispatchEntrypointsFixture,
			bindings: {},
		});
		expect(missingBinding.ok).toBe(false);
		if (!missingBinding.ok) {
			expect(missingBinding.error.code).toBe("dispatch_transport_error");
		}
	});

	test("returns typed transport error when dispatch request contract is malformed", () => {
		const malformed = dispatchSurfaceRequest({
			dispatchPlans: createDispatchPlanFixture(),
			request: {
				surfaceId: "",
				surfaceType: "http",
				attributes: {
					method: "GET",
					path: "/messages",
				},
			} as never,
		});
		expect(malformed.ok).toBe(false);
		if (!malformed.ok) {
			expect(malformed.error.code).toBe("dispatch_transport_error");
		}
	});
});
