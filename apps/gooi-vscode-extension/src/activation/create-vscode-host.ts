import * as vscode from "vscode";

import type { GooiExtensionHost } from "../contracts/host-ports";
import { createCodeLensRegistrar } from "./vscode-host/register-code-lens-provider";
import { createCompletionRegistrars } from "./vscode-host/register-completion-provider";
import { createNavigationRegistrars } from "./vscode-host/register-navigation-providers";
import { createRenameRegistrar } from "./vscode-host/register-rename-provider";
import {
	toEditorDocument,
	toVscodeDiagnosticSeverity,
	toVscodeRange,
} from "./vscode-host/shared";

/**
 * Creates a VS Code host adapter for extension activation.
 *
 * @returns Host port implementation.
 *
 * @example
 * const host = createVscodeHost();
 */
export const createVscodeHost = (): GooiExtensionHost => {
	const completionState: {
		resolveHandler?: (item: unknown) => Promise<unknown>;
	} = {};

	return {
		...createCompletionRegistrars(completionState),
		...createNavigationRegistrars(),
		...createCodeLensRegistrar(),
		...createRenameRegistrar(),
		getConfigurationSection: (section) => {
			const configuration = vscode.workspace.getConfiguration(section);
			return {
				contextPath: configuration.get("contextPath"),
				diagnosticsMode: configuration.get("diagnosticsMode"),
				enableCodeLens: configuration.get("enableCodeLens"),
			};
		},
		getWorkspaceRootPath: () =>
			vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
		onDidOpenDocument: (handler) =>
			vscode.workspace.onDidOpenTextDocument((document: unknown) =>
				handler(toEditorDocument(document as never)),
			),
		onDidChangeDocument: (handler) =>
			vscode.workspace.onDidChangeTextDocument((event: unknown) =>
				handler(toEditorDocument((event as { document: never }).document)),
			),
		registerCommand: (commandId, handler) =>
			vscode.commands.registerCommand(commandId, (...args: unknown[]) =>
				handler(...args),
			),
		createDiagnosticsCollection: (name) => {
			const collection = vscode.languages.createDiagnosticCollection(name);
			return {
				set: (uri, diagnostics) => {
					collection.set(
						vscode.Uri.parse(uri),
						diagnostics.map((diagnostic) => {
							const result = new vscode.Diagnostic(
								toVscodeRange(diagnostic.range),
								diagnostic.message,
								toVscodeDiagnosticSeverity(diagnostic.severity),
							);
							result.code = diagnostic.code;
							return result;
						}),
					);
				},
				clear: () => collection.clear(),
				dispose: () => collection.dispose(),
			};
		},
		showInformationMessage: (message) =>
			vscode.window.showInformationMessage(message),
		showWarningMessage: (message) => vscode.window.showWarningMessage(message),
		showErrorMessage: (message) => vscode.window.showErrorMessage(message),
	};
};
