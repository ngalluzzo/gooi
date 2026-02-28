import { describe, expect, test } from "bun:test";

import { getAuthoringDefinition } from "../src/features/navigation/get-authoring-definition";
import { getAuthoringHover } from "../src/features/navigation/get-authoring-hover";
import { getAuthoringReferences } from "../src/features/navigation/get-authoring-references";
import { listAuthoringDocumentSymbols } from "../src/features/navigation/list-authoring-document-symbols";
import { searchAuthoringWorkspaceSymbols } from "../src/features/navigation/search-authoring-workspace-symbols";
import { authoringReadFixture } from "./fixtures/authoring-read.fixture";

describe("lsp navigation read path", () => {
	test("resolves hover for capability symbol under cursor", () => {
		const result = getAuthoringHover({
			context: authoringReadFixture,
			position: { line: 3, character: 16 },
		});

		expect(result.parity.status).toBe("matched");
		expect(result.hover?.contents).toContain("message.is_allowed");
		expect(result.hover?.contents).toContain("capability");
		expect(result.hover?.contents).toContain("certification: uncertified");
		expect(result.hover?.contents).toContain("trust tier: unknown");
	});

	test("resolves definition for expression reference to step binding", () => {
		const result = getAuthoringDefinition({
			context: authoringReadFixture,
			position: { line: 12, character: 10 },
		});

		expect(result.location?.symbolId).toBe("step:generated_ids");
		expect(result.location?.range.start.line).toBe(3);
	});

	test("lists references for definition symbol with optional declaration", () => {
		const withoutDeclaration = getAuthoringReferences({
			context: authoringReadFixture,
			position: { line: 12, character: 10 },
			includeDeclaration: false,
		});
		expect(withoutDeclaration.items.map((item) => item.symbolId)).toEqual([
			"expr:generated_ids.ids.0",
		]);

		const withDeclaration = getAuthoringReferences({
			context: authoringReadFixture,
			position: { line: 12, character: 10 },
			includeDeclaration: true,
		});
		expect(withDeclaration.items.map((item) => item.symbolId)).toEqual([
			"step:generated_ids",
			"expr:generated_ids.ids.0",
		]);
	});

	test("lists document symbols in deterministic order", () => {
		const result = listAuthoringDocumentSymbols({
			context: authoringReadFixture,
		});

		expect(result.items.map((item) => item.symbolId)).toEqual([
			"action:guestbook.submit",
			"step:generated_ids",
			"ambient:payload.user_id",
			"signal:message.created",
			"entrypoint:home.data.messages",
			"expr:generated_ids.ids.0",
		]);
	});

	test("filters workspace symbols by query", () => {
		const result = searchAuthoringWorkspaceSymbols({
			context: authoringReadFixture,
			query: "message",
		});

		expect(result.items.map((item) => item.symbolId)).toEqual([
			"entrypoint:home.data.messages",
			"signal:message.created",
		]);
	});
});
