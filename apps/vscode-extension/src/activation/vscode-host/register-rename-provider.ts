import * as vscode from "vscode";

import type { GooiExtensionHost } from "../../contracts/host-ports";
import { gooiSelector, toEditorDocument, toVscodeRange } from "./shared";

/**
 * Creates rename provider registration for the VS Code host adapter.
 */
export const createRenameRegistrar = (): Pick<
	GooiExtensionHost,
	"registerRenameProvider"
> => ({
	registerRenameProvider: (handlers) =>
		vscode.languages.registerRenameProvider(gooiSelector, {
			prepareRename: async (document: unknown, position: unknown) => {
				const result = (await handlers.prepare({
					document: toEditorDocument(document as never),
					position: position as never,
				})) as {
					ok: boolean;
					range?: never;
					error?: { message: string };
				};
				if (!result.ok || result.range === undefined) {
					throw new Error(result.error?.message ?? "Rename is not allowed.");
				}
				return toVscodeRange(result.range);
			},
			provideRenameEdits: async (
				document: unknown,
				position: unknown,
				newName: string,
			) => {
				const result = (await handlers.rename({
					document: toEditorDocument(document as never),
					position: position as never,
					newName,
				})) as {
					ok: boolean;
					edit?: {
						changes: Array<{
							documentPath: string;
							range: never;
							newText: string;
						}>;
					};
					error?: { message: string };
				};
				if (!result.ok || result.edit === undefined) {
					throw new Error(result.error?.message ?? "Rename failed.");
				}
				const edit = new vscode.WorkspaceEdit();
				for (const change of result.edit.changes) {
					edit.replace(
						vscode.Uri.file(change.documentPath),
						toVscodeRange(change.range),
						change.newText,
					);
				}
				return edit;
			},
		}),
});
