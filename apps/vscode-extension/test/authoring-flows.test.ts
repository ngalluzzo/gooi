import { afterEach, describe, expect, test } from "bun:test";

import { activateExtension } from "../src/activation/activate-extension";
import { createAuthoringWorkspaceFixture } from "./fixtures/create-authoring-workspace.fixture";
import { createExtensionHostFixture } from "./fixtures/create-extension-host.fixture";

const cleanup: Array<() => void> = [];

afterEach(() => {
	while (cleanup.length > 0) {
		cleanup.pop()?.();
	}
});

describe("gooi vscode extension authoring flows", () => {
	test("runs didOpen -> didChange -> diagnostics -> completion loop", async () => {
		const workspace = createAuthoringWorkspaceFixture();
		cleanup.push(workspace.dispose);
		const hostFixture = createExtensionHostFixture({
			workspaceRoot: workspace.workspaceRoot,
		});
		const activation = activateExtension({ host: hostFixture.host });
		cleanup.push(() => activation.dispose());

		const openedDocument = {
			uri: workspace.documentUri,
			path: workspace.documentPath,
			text: workspace.documentText,
			version: 1,
		};
		await hostFixture.emitDidOpen(openedDocument);
		await hostFixture.emitDidChange({
			...openedDocument,
			text: `${openedDocument.text}\n# test change`,
			version: 2,
		});

		const diagnostics = hostFixture.diagnostics.get(workspace.documentUri);
		expect(diagnostics).toBeDefined();

		const completion = (await hostFixture.callCompletion({
			document: openedDocument,
			position: { line: 3, character: 10 },
		})) as { items: Array<{ label: string }> };
		expect(completion.items.map((item) => item.label)).toEqual([
			"gooi-marketplace-bun-sqlite.insert_message",
			"message.is_allowed",
		]);
	});

	test("supports hover/definition/references/symbols/lenses/rename/commands", async () => {
		const workspace = createAuthoringWorkspaceFixture();
		cleanup.push(workspace.dispose);
		const hostFixture = createExtensionHostFixture({
			workspaceRoot: workspace.workspaceRoot,
		});
		const activation = activateExtension({ host: hostFixture.host });
		cleanup.push(() => activation.dispose());

		const document = {
			uri: workspace.documentUri,
			path: workspace.documentPath,
			text: workspace.documentText,
			version: 1,
		};
		await hostFixture.emitDidOpen(document);

		const hover = (await hostFixture.callHover({
			document,
			position: { line: 3, character: 12 },
		})) as { contents?: string } | null;
		expect(hover?.contents).toContain("capability message.is_allowed");

		const definition = (await hostFixture.callDefinition({
			document,
			position: { line: 12, character: 8 },
		})) as { symbolId?: string } | null;
		expect(definition?.symbolId).toBe("step:generated_ids");

		const references = (await hostFixture.callReferences({
			document,
			position: { line: 12, character: 8 },
			includeDeclaration: true,
		})) as Array<{ symbolId: string }>;
		expect(
			references.some(
				(reference) => reference.symbolId === "step:generated_ids",
			),
		).toBe(true);

		const documentSymbols = (await hostFixture.callDocumentSymbols(
			document,
		)) as Array<{ symbolId: string }>;
		expect(documentSymbols.length).toBeGreaterThan(0);

		const workspaceSymbols = (await hostFixture.callWorkspaceSymbols(
			"guestbook",
		)) as Array<{ name: string }>;
		expect(
			workspaceSymbols.some((symbol) => symbol.name.includes("guestbook")),
		).toBe(true);

		const lenses = (await hostFixture.callCodeLensProvide(document)) as Array<{
			kind: string;
			symbolId: string;
		}>;
		const capabilityLens = lenses.find(
			(lens) => lens.kind === "show_providers_for_capability",
		);
		if (capabilityLens === undefined) {
			throw new Error("Expected capability lens.");
		}
		const resolvedCapabilityLens = (await hostFixture.callCodeLensResolve(
			capabilityLens,
		)) as { command?: { id?: string } };
		expect(resolvedCapabilityLens.command?.id).toBe(
			"gooi.authoring.showProviders",
		);

		const prepareRename = (await hostFixture.callRenamePrepare({
			document,
			position: { line: 12, character: 8 },
		})) as { ok: boolean };
		expect(prepareRename.ok).toBe(true);
		const rename = (await hostFixture.callRename({
			document,
			position: { line: 12, character: 8 },
			newName: "message_ids",
		})) as { ok: boolean; edit?: { changes: unknown[] } };
		expect(rename.ok).toBe(true);
		expect(rename.edit?.changes.length).toBeGreaterThan(0);

		await hostFixture.runCommand("gooi.authoring.showProviders", {
			capabilityId: "message.is_allowed",
		});
		expect(
			hostFixture.messages.info.some((message) =>
				message.includes("message.is_allowed"),
			),
		).toBe(true);
		await hostFixture.runCommand("gooi.authoring.lockfileMismatch", {
			symbolId: "action:guestbook.submit",
		});
		expect(
			hostFixture.messages.warning.some((message) =>
				message.includes("Lockfile mismatch"),
			),
		).toBe(true);
	});
});
