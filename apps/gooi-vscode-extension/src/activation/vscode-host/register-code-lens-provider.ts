import * as vscode from "vscode";

import type { GooiExtensionHost } from "../../contracts/host-ports";
import { gooiSelector, toEditorDocument, toVscodeRange } from "./shared";

/**
 * Creates code-lens provider registration for the VS Code host adapter.
 */
export const createCodeLensRegistrar = (): Pick<
	GooiExtensionHost,
	"registerCodeLensProvider"
> => {
	const lensMetadata = new WeakMap<vscode.CodeLens, unknown>();

	return {
		registerCodeLensProvider: (handlers) =>
			vscode.languages.registerCodeLensProvider(gooiSelector, {
				provideCodeLenses: async (document: unknown) =>
					(
						(await handlers.provide(
							toEditorDocument(document as never),
						)) as Array<{
							range: never;
						}>
					).map((lens) => {
						const codeLens = new vscode.CodeLens(toVscodeRange(lens.range));
						lensMetadata.set(codeLens, lens);
						return codeLens;
					}),
				resolveCodeLens: async (lens: vscode.CodeLens) => {
					const resolved = (await handlers.resolve(
						lensMetadata.get(lens) ?? lens,
					)) as {
						command?: {
							id: string;
							title: string;
							arguments?: unknown[];
						};
					};
					if (resolved.command !== undefined) {
						lens.command = {
							command: resolved.command.id,
							title: resolved.command.title,
							...(resolved.command.arguments === undefined
								? {}
								: { arguments: resolved.command.arguments }),
						};
					}
					return lens;
				},
			}),
	};
};
