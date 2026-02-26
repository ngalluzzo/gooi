import { describe, expect, test } from "bun:test";

import { applyAuthoringRename } from "../src/features/rename/apply-authoring-rename";
import { prepareAuthoringRename } from "../src/features/rename/prepare-authoring-rename";
import { authoringActionAndRenameFixture } from "./fixtures/authoring-action-and-rename.fixture";

describe("lsp rename flows", () => {
	test("prepares rename from expression variable cursor by resolving declaration", () => {
		const result = prepareAuthoringRename({
			context: authoringActionAndRenameFixture,
			position: { line: 12, character: 10 },
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			throw new Error("Expected prepare rename to succeed.");
		}
		expect(result.symbolId).toBe("step:generated_ids");
		expect(result.placeholder).toBe("generated_ids");
		expect(result.range.start.line).toBe(15);
	});

	test("rejects prepare rename for non-renameable symbol kind", () => {
		const result = prepareAuthoringRename({
			context: authoringActionAndRenameFixture,
			position: { line: 13, character: 8 },
		});

		expect(result.ok).toBe(false);
		if (result.ok) {
			throw new Error("Expected prepare rename to fail.");
		}
		expect(result.error.code).toBe("rename_conflict_error");
		expect(result.error.message).toContain(
			"Ambient runtime symbols are reserved",
		);
	});

	test("applies rename edits across declaration and references", () => {
		const result = applyAuthoringRename({
			context: authoringActionAndRenameFixture,
			position: { line: 12, character: 10 },
			newName: "message_ids",
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			throw new Error("Expected rename to succeed.");
		}
		expect(result.edit.changes).toEqual([
			{
				documentUri: "spec://docs/demo.yml",
				documentPath: "docs/demo.yml",
				symbolId: "expr:generated_ids.ids.0",
				range: {
					start: { line: 12, character: 4 },
					end: { line: 12, character: 23 },
				},
				newText: "message_ids.ids.0",
			},
			{
				documentUri: "spec://docs/demo.yml",
				documentPath: "docs/demo.yml",
				symbolId: "step:generated_ids",
				range: {
					start: { line: 15, character: 4 },
					end: { line: 15, character: 17 },
				},
				newText: "message_ids",
			},
		]);
	});

	test("rejects rename when new symbol name collides with existing symbol", () => {
		const result = applyAuthoringRename({
			context: authoringActionAndRenameFixture,
			position: { line: 12, character: 10 },
			newName: "existing_ids",
		});

		expect(result.ok).toBe(false);
		if (result.ok) {
			throw new Error("Expected rename to fail.");
		}
		expect(result.error.code).toBe("rename_conflict_error");
		expect(result.error.message).toContain("already exists");
	});
});
