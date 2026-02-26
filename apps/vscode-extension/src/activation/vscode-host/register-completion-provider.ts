import * as vscode from "vscode";

import type {
	EditorDocument,
	EditorPosition,
	GooiExtensionHost,
	HostDisposable,
} from "../../contracts/host-ports";
import { gooiSelector, toEditorDocument } from "./shared";

interface CompletionRegistrarState {
	resolveHandler?: (item: unknown) => Promise<unknown>;
}

/**
 * Creates completion registration helpers for the VS Code host adapter.
 */
export const createCompletionRegistrars = (
	state: CompletionRegistrarState,
): Pick<
	GooiExtensionHost,
	"registerCompletionProvider" | "registerCompletionResolveProvider"
> => {
	const completionMetadata = new WeakMap<vscode.CompletionItem, unknown>();

	return {
		registerCompletionProvider: (handler, triggerCharacters) =>
			vscode.languages.registerCompletionItemProvider(
				gooiSelector,
				{
					provideCompletionItems: async (
						document: unknown,
						position: unknown,
					) => {
						const result = (await handler({
							document: toEditorDocument(document as never),
							position: {
								line: (position as { line: number }).line,
								character: (position as { character: number }).character,
							},
						})) as { items?: Array<Record<string, unknown>> };
						return (result.items ?? []).map((item) => {
							const completion = new vscode.CompletionItem(
								String(item.label ?? ""),
								vscode.CompletionItemKind.Function,
							);
							if (typeof item.insertText === "string") {
								completion.insertText = item.insertText;
							}
							if (typeof item.detail === "string") {
								completion.detail = item.detail;
							}
							if (typeof item.documentation === "string") {
								completion.documentation = item.documentation;
							}
							completionMetadata.set(completion, item);
							return completion;
						});
					},
					...(state.resolveHandler === undefined
						? {}
						: {
								resolveCompletionItem: async (
									item: vscode.CompletionItem,
								): Promise<vscode.CompletionItem> => {
									const rawItem = completionMetadata.get(item) ?? item;
									const resolved = (await state.resolveHandler?.(rawItem)) as
										| Record<string, unknown>
										| undefined;
									if (
										resolved !== undefined &&
										typeof resolved.detail === "string"
									) {
										item.detail = resolved.detail;
									}
									if (
										resolved !== undefined &&
										typeof resolved.documentation === "string"
									) {
										item.documentation = resolved.documentation;
									}
									if (
										resolved !== undefined &&
										typeof resolved.insertText === "string"
									) {
										item.insertText = resolved.insertText;
									}
									return item;
								},
							}),
				},
				...triggerCharacters,
			),
		registerCompletionResolveProvider: (
			handler: (item: unknown) => Promise<unknown>,
		): HostDisposable => {
			state.resolveHandler = handler;
			return { dispose: () => void delete state.resolveHandler };
		},
	};
};

/**
 * Builds editor-position payload for completion tests and adapters.
 */
export const asCompletionRequest = (input: {
	document: EditorDocument;
	position: EditorPosition;
}): {
	document: EditorDocument;
	position: EditorPosition;
} => input;
