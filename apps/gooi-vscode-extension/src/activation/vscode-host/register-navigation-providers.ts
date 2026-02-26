import * as vscode from "vscode";

import type { GooiExtensionHost } from "../../contracts/host-ports";
import { gooiSelector, toEditorDocument, toVscodeRange } from "./shared";

/**
 * Creates hover/definition/references/symbol provider registrations.
 */
export const createNavigationRegistrars = (): Pick<
	GooiExtensionHost,
	| "registerHoverProvider"
	| "registerDefinitionProvider"
	| "registerReferencesProvider"
	| "registerWorkspaceSymbolProvider"
	| "registerDocumentSymbolProvider"
> => ({
	registerHoverProvider: (handler) =>
		vscode.languages.registerHoverProvider(gooiSelector, {
			provideHover: async (document: unknown, position: unknown) => {
				const hover = (await handler({
					document: toEditorDocument(document as never),
					position: position as never,
				})) as { contents?: string; range?: never } | null;
				if (hover?.contents === undefined) {
					return undefined;
				}
				return new vscode.Hover(
					hover.contents,
					hover.range ? toVscodeRange(hover.range) : undefined,
				);
			},
		}),
	registerDefinitionProvider: (handler) =>
		vscode.languages.registerDefinitionProvider(gooiSelector, {
			provideDefinition: async (document: unknown, position: unknown) => {
				const location = (await handler({
					document: toEditorDocument(document as never),
					position: position as never,
				})) as { documentUri?: string; range?: never } | null;
				if (
					location?.documentUri === undefined ||
					location.range === undefined
				) {
					return undefined;
				}
				return new vscode.Location(
					vscode.Uri.parse(location.documentUri),
					toVscodeRange(location.range),
				);
			},
		}),
	registerReferencesProvider: (handler) =>
		vscode.languages.registerReferenceProvider(gooiSelector, {
			provideReferences: async (document: unknown, position: unknown) => {
				const references = (await handler({
					document: toEditorDocument(document as never),
					position: position as never,
					includeDeclaration: true,
				})) as Array<{ documentUri: string; range: never }>;
				return references.map(
					(reference) =>
						new vscode.Location(
							vscode.Uri.parse(reference.documentUri),
							toVscodeRange(reference.range),
						),
				);
			},
		}),
	registerWorkspaceSymbolProvider: (handler) =>
		vscode.languages.registerWorkspaceSymbolProvider({
			provideWorkspaceSymbols: async (query: string) =>
				(
					(await handler(query)) as Array<{
						name: string;
						documentUri: string;
						range: never;
					}>
				).map(
					(symbol) =>
						new vscode.SymbolInformation(
							symbol.name,
							vscode.SymbolKind.Function,
							"gooi",
							new vscode.Location(
								vscode.Uri.parse(symbol.documentUri),
								toVscodeRange(symbol.range),
							),
						),
				),
		}),
	registerDocumentSymbolProvider: (handler) =>
		vscode.languages.registerDocumentSymbolProvider(gooiSelector, {
			provideDocumentSymbols: async (document: unknown) =>
				(
					(await handler(toEditorDocument(document as never))) as Array<{
						name: string;
						range: never;
					}>
				).map(
					(symbol) =>
						new vscode.DocumentSymbol(
							symbol.name,
							"",
							vscode.SymbolKind.Function,
							toVscodeRange(symbol.range),
							toVscodeRange(symbol.range),
						),
				),
		}),
});
