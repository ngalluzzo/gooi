import { describe, expect, test } from "bun:test";
import { stableStringify } from "@gooi/stable-json";
import { normalizeAuthoringSpec } from "../../src/compile/normalize-authoring-spec";
import { createComposableEntrypointSpecFixture } from "../fixtures/composable-entrypoint-spec.fixture";

describe("spec-compiler authoring normalization", () => {
	test("normalizes known projection alias keys into canonical shape", () => {
		const spec = createComposableEntrypointSpecFixture();
		(spec.domain.projections as Record<string, unknown>).latest_messages = {
			strategy: "from_collection",
			collection: "messages",
			pagination: {
				mode: "page",
				page_arg: "page",
				page_size_arg: "page_size",
				default_page: 1,
				default_page_size: 10,
				max_page_size: 50,
			},
			sort: [{ field: "created_at", direction: "desc" }],
			fields: [{ source: "id", as: "id" }],
		};

		const normalized = normalizeAuthoringSpec(spec);
		const projection = normalized.domain.projections?.latest_messages as
			| Readonly<Record<string, unknown>>
			| undefined;
		const pagination = projection?.pagination as
			| Readonly<Record<string, unknown>>
			| undefined;

		expect(projection?.collectionId).toBe("messages");
		expect(pagination?.pageArg).toBe("page");
		expect(pagination?.pageSizeArg).toBe("page_size");
		expect(pagination?.defaultPage).toBe(1);
		expect(pagination?.defaultPageSize).toBe(10);
		expect(pagination?.maxPageSize).toBe(50);
	});

	test("normalization output is deterministic across alias ordering", () => {
		const first = createComposableEntrypointSpecFixture();
		const second = createComposableEntrypointSpecFixture();
		(first.domain.projections as Record<string, unknown>).latest_messages = {
			strategy: "from_collection",
			collection: "messages",
			pagination: {
				mode: "page",
				page_arg: "page",
				page_size_arg: "page_size",
				default_page: 1,
				default_page_size: 10,
				max_page_size: 50,
			},
			fields: [{ source: "id", as: "id" }],
			sort: [{ field: "created_at", direction: "desc" }],
		};
		(second.domain.projections as Record<string, unknown>).latest_messages = {
			sort: [{ direction: "desc", field: "created_at" }],
			fields: [{ as: "id", source: "id" }],
			pagination: {
				max_page_size: 50,
				default_page_size: 10,
				default_page: 1,
				page_size_arg: "page_size",
				page_arg: "page",
				mode: "page",
			},
			collection: "messages",
			strategy: "from_collection",
		};

		const normalizedFirst = normalizeAuthoringSpec(first);
		const normalizedSecond = normalizeAuthoringSpec(second);

		expect(stableStringify(normalizedFirst.domain.projections)).toBe(
			stableStringify(normalizedSecond.domain.projections),
		);
	});
});
