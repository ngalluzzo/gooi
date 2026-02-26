import { describe, expect, test } from "bun:test";
import { bindSurfaceInput } from "../src/engine";
import {
	listMessagesBindingFixture,
	listMessagesEntrypointFixture,
	listMessagesRequestFixture,
} from "./fixtures/surface-binding.fixture";

describe("surface-runtime", () => {
	test("binds explicit values, scalar coercions, and defaults deterministically", () => {
		const result = bindSurfaceInput({
			request: listMessagesRequestFixture,
			entrypoint: listMessagesEntrypointFixture,
			binding: listMessagesBindingFixture,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		expect(result.value).toEqual({
			page: 2,
			page_size: 10,
			q: "hello",
			as_of: "2026-02-26T00:00:00.000Z",
			show_deleted: true,
		});
	});

	test("preserves explicit null values instead of replacing them with defaults", () => {
		const result = bindSurfaceInput({
			request: { query: { page: null } },
			entrypoint: listMessagesEntrypointFixture,
			binding: listMessagesBindingFixture,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.value.page).toBeNull();
		expect(result.value.page_size).toBe(10);
	});

	test("fails when coercion cannot convert the value", () => {
		const result = bindSurfaceInput({
			request: { query: { page: "not-a-number" } },
			entrypoint: listMessagesEntrypointFixture,
			binding: listMessagesBindingFixture,
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("binding_error");
		}
	});

	test("fails when binding references an undeclared field", () => {
		const result = bindSurfaceInput({
			request: listMessagesRequestFixture,
			entrypoint: listMessagesEntrypointFixture,
			binding: {
				...listMessagesBindingFixture,
				fieldBindings: {
					...listMessagesBindingFixture.fieldBindings,
					not_declared: "query.anything",
				},
			},
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("binding_error");
		}
	});
});
