import { describe, expect, test } from "bun:test";

import { createAuthoringProtocolServer } from "../src/features/protocol/create-authoring-protocol-server";
import { authoringActionAndRenameFixture } from "./fixtures/authoring-action-and-rename.fixture";

describe("product-authoring-lsp protocol e2e", () => {
	test("routes completion, code lens, and rename over protocol messages", () => {
		const server = createAuthoringProtocolServer({
			context: authoringActionAndRenameFixture,
			initialVersion: 1,
		});

		const didOpen = server.handleMessage({
			id: null,
			method: "textDocument/didOpen",
			params: {
				version: 2,
				documentText: authoringActionAndRenameFixture.documentText,
			},
		});
		expect(didOpen.error).toBeUndefined();

		const completionResponse = server.handleMessage({
			id: 1,
			method: "textDocument/completion",
			params: { position: { line: 3, character: 10 } },
		});
		expect(completionResponse.error).toBeUndefined();
		const completionItems = (
			completionResponse.result as { items: Array<{ label: string }> }
		).items;
		expect(completionItems.map((item) => item.label)).toEqual([
			"gooi-marketplace-bun-sqlite.insert_message",
			"message.is_allowed",
		]);

		const codeLensResponse = server.handleMessage({
			id: 2,
			method: "textDocument/codeLens",
			params: {},
		});
		expect(codeLensResponse.error).toBeUndefined();
		const unresolvedProviderLens = (
			codeLensResponse.result as {
				lenses: Array<{ kind: string; symbolId: string; range: unknown }>;
			}
		).lenses.find((lens) => lens.kind === "show_providers_for_capability");
		if (unresolvedProviderLens === undefined) {
			throw new Error(
				"Expected unresolved provider lens from protocol response.",
			);
		}

		const resolvedLensResponse = server.handleMessage({
			id: 3,
			method: "codeLens/resolve",
			params: { lens: unresolvedProviderLens },
		});
		expect(resolvedLensResponse.error).toBeUndefined();
		expect(
			(
				resolvedLensResponse.result as {
					lens: { command?: { id: string } };
				}
			).lens.command?.id,
		).toBe("gooi.authoring.showProviders");

		const prepareRenameResponse = server.handleMessage({
			id: 4,
			method: "textDocument/prepareRename",
			params: { position: { line: 12, character: 10 } },
		});
		expect(prepareRenameResponse.error).toBeUndefined();
		expect(
			(prepareRenameResponse.result as { ok: boolean; symbolId?: string }).ok,
		).toBe(true);

		const renameResponse = server.handleMessage({
			id: 5,
			method: "textDocument/rename",
			params: { position: { line: 12, character: 10 }, newName: "message_ids" },
		});
		expect(renameResponse.error).toBeUndefined();
		expect((renameResponse.result as { ok: boolean }).ok).toBe(true);
	});

	test("reports protocol-level errors on invalid params", () => {
		const server = createAuthoringProtocolServer({
			context: authoringActionAndRenameFixture,
		});

		const response = server.handleMessage({
			id: 6,
			method: "textDocument/rename",
			params: {
				position: { line: 12, character: 10 },
				newName: "invalid name",
			},
		});

		expect(response.result).toBeUndefined();
		expect(response.error?.message).toContain("Invalid string");
	});
});
