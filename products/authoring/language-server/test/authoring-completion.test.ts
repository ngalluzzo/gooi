import { describe, expect, test } from "bun:test";

import { authoringCompletionListSchema } from "../src/contracts/completion-contracts";
import { listAuthoringCompletionItems } from "../src/features/completion/list-authoring-completion-items";
import { resolveAuthoringCompletionItem } from "../src/features/completion/resolve-authoring-completion-item";
import { positionForToken } from "./fixtures/authoring-diagnostics.fixture";
import { authoringReadFixture } from "./fixtures/authoring-read.fixture";
import completionDoGolden from "./fixtures/completion-do.golden.json";

describe("lsp completion", () => {
	test("lists deterministic capability completions in do blocks", () => {
		const result = listAuthoringCompletionItems({
			context: authoringReadFixture,
			position: { line: 3, character: 10 },
		});

		expect(result.parity.status).toBe("matched");
		expect(result).toEqual(
			authoringCompletionListSchema.parse(completionDoGolden),
		);
	});

	test("lists signal completions in refresh_on_signals blocks", () => {
		const result = listAuthoringCompletionItems({
			context: authoringReadFixture,
			position: { line: 10, character: 10 },
		});

		expect(result.items.map((item) => item.label)).toEqual(["message.created"]);
		expect(result.items[0]?.kind).toBe("signal");
	});

	test("lists context-aware guard policy completions", () => {
		const result = listAuthoringCompletionItems({
			context: authoringReadFixture,
			position: positionForToken(authoringReadFixture.documentText, "onFail:", {
				line: 14,
				character: 10,
			}),
		});

		expect(result.items.map((item) => item.label)).toEqual([
			"abort",
			"emit_violation",
			"fail_action",
			"log_and_continue",
		]);
		expect(result.items.every((item) => item.kind === "guard_policy")).toBe(
			true,
		);
	});

	test("lists context-aware scenario persona completions", () => {
		const result = listAuthoringCompletionItems({
			context: authoringReadFixture,
			position: positionForToken(
				authoringReadFixture.documentText,
				"persona:",
				{
					line: 18,
					character: 12,
				},
			),
		});

		expect(result.items).toEqual([
			expect.objectContaining({
				label: "moderator",
				kind: "persona",
			}),
		]);
	});

	test("resolves completion details from capability index metadata", () => {
		const base = listAuthoringCompletionItems({
			context: authoringReadFixture,
			position: { line: 3, character: 10 },
		});
		const unresolved = base.items.find(
			(item) => item.label === "message.is_allowed",
		);
		if (unresolved === undefined) {
			throw new Error("Fixture completion must include message.is_allowed.");
		}

		const resolved = resolveAuthoringCompletionItem({
			context: authoringReadFixture,
			item: unresolved,
		});

		expect(resolved.parity.status).toBe("matched");
		expect(resolved.item.detail).toContain("local-spec");
		expect(resolved.item.detail).toContain("uncertified/unknown");
		expect(resolved.item.documentation).toContain("certification: uncertified");
		expect(resolved.item.documentation).toContain("trust tier: unknown");
		expect(resolved.item.documentation).toContain("last verified at: unknown");
		expect(resolved.item.documentation).toContain("schema://local");
	});
});
