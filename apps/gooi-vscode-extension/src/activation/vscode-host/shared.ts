import * as vscode from "vscode";

import type {
	EditorDiagnostic,
	EditorDocument,
	EditorPosition,
	EditorRange,
} from "../../contracts/host-ports";

/** Gooi document selector for VS Code provider registration. */
export const gooiSelector: vscode.DocumentSelector = {
	language: "gooi",
	scheme: "file",
};

/** Converts extension positions into VS Code positions. */
export const toVscodePosition = (value: EditorPosition): vscode.Position =>
	new vscode.Position(value.line, value.character);

/** Converts extension ranges into VS Code ranges. */
export const toVscodeRange = (value: EditorRange): vscode.Range =>
	new vscode.Range(toVscodePosition(value.start), toVscodePosition(value.end));

/** Converts VS Code text documents into extension document projections. */
export const toEditorDocument = (document: {
	uri: vscode.Uri;
	getText: () => string;
	version: number;
}): EditorDocument => ({
	uri: document.uri.toString(),
	path: document.uri.fsPath,
	text: document.getText(),
	version: document.version,
});

/** Converts extension diagnostic severities into VS Code severities. */
export const toVscodeDiagnosticSeverity = (
	severity: EditorDiagnostic["severity"],
): vscode.DiagnosticSeverity => {
	if (severity === "warning") {
		return vscode.DiagnosticSeverity.Warning;
	}
	if (severity === "info") {
		return vscode.DiagnosticSeverity.Information;
	}
	return vscode.DiagnosticSeverity.Error;
};
