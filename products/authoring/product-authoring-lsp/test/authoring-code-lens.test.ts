import { describe, expect, test } from "bun:test";

import { listAuthoringCodeLenses } from "../src/features/actions/list-authoring-code-lenses";
import { resolveAuthoringCodeLens } from "../src/features/actions/resolve-authoring-code-lens";
import { authoringActionAndRenameFixture } from "./fixtures/authoring-action-and-rename.fixture";

describe("product-authoring-lsp code lens actions", () => {
	test("lists deterministic code lenses for default phase-4 actions", () => {
		const result = listAuthoringCodeLenses({
			context: authoringActionAndRenameFixture,
		});

		expect(result.parity.status).toBe("matched");
		expect(
			result.lenses.map((lens) => `${lens.kind}:${lens.symbolId}`),
		).toEqual([
			"run_query_or_mutation:action:guestbook.submit",
			"show_providers_for_capability:capability:message.is_allowed",
			"show_affected_queries_for_signal:signal:message.created",
			"run_query_or_mutation:entrypoint:home.data.messages",
		]);
	});

	test("resolves provider lens command with provider counts", () => {
		const list = listAuthoringCodeLenses({
			context: authoringActionAndRenameFixture,
		});
		const unresolved = list.lenses.find(
			(lens) => lens.kind === "show_providers_for_capability",
		);
		if (unresolved === undefined) {
			throw new Error("Fixture must include a provider code lens.");
		}

		const resolved = resolveAuthoringCodeLens({
			context: authoringActionAndRenameFixture,
			lens: unresolved,
		});

		expect(resolved.parity.status).toBe("matched");
		expect(resolved.lens.command?.id).toBe("gooi.authoring.showProviders");
		expect(resolved.lens.command?.title).toContain("Show providers");
	});

	test("blocks runtime-backed run lens commands on lockfile mismatch", () => {
		const list = listAuthoringCodeLenses({
			context: {
				...authoringActionAndRenameFixture,
				lockfile: authoringActionAndRenameFixture.staleArtifactLockfile,
			},
		});
		const unresolved = list.lenses.find(
			(lens) => lens.kind === "run_query_or_mutation",
		);
		if (unresolved === undefined) {
			throw new Error("Fixture must include a run code lens.");
		}

		const resolved = resolveAuthoringCodeLens({
			context: {
				...authoringActionAndRenameFixture,
				lockfile: authoringActionAndRenameFixture.staleArtifactLockfile,
			},
			lens: unresolved,
		});

		expect(resolved.parity.status).toBe("mismatch");
		expect(resolved.lens.command?.id).toBe("gooi.authoring.lockfileMismatch");
		expect(resolved.lens.command?.title).toContain("blocked");
	});
});
