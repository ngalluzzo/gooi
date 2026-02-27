import type {
	AuthoringPosition,
	AuthoringRange,
} from "@gooi/language-server/contracts/positions";

/**
 * Zero-cost disposable returned by host registrations.
 */
export interface HostDisposable {
	/** Releases the host resource registration. */
	dispose: () => void;
}

/**
 * Cursor position in a text document.
 */
export type EditorPosition = AuthoringPosition;

/**
 * Selection range in a text document.
 */
export type EditorRange = AuthoringRange;

/**
 * Text document projection used by the extension service.
 */
export interface EditorDocument {
	/** Canonical document URI string. */
	uri: string;
	/** Filesystem path for the current document. */
	path: string;
	/** Current document text snapshot. */
	text: string;
	/** Monotonic document version from editor lifecycle events. */
	version: number;
}

/**
 * Diagnostic payload consumable by editor adapters.
 */
export interface EditorDiagnostic {
	/** Stable diagnostic code. */
	code: string;
	/** Human-readable diagnostic message. */
	message: string;
	/** Diagnostic severity. */
	severity: "error" | "warning" | "info";
	/** Diagnostic source range. */
	range: EditorRange;
}

/**
 * Minimal host port required by activation and provider registration.
 */
export interface GooiExtensionHost {
	/** Reads one configuration section by key. */
	getConfigurationSection: (section: string) => Record<string, unknown>;
	/** Returns the workspace root used to load authoring artifacts. */
	getWorkspaceRootPath: () => string | undefined;
	/** Subscribes to document-open lifecycle events. */
	onDidOpenDocument: (
		handler: (document: EditorDocument) => void | Promise<void>,
	) => HostDisposable;
	/** Subscribes to document-change lifecycle events. */
	onDidChangeDocument: (
		handler: (document: EditorDocument) => void | Promise<void>,
	) => HostDisposable;
	/** Registers a completion provider. */
	registerCompletionProvider: (
		handler: (input: {
			document: EditorDocument;
			position: EditorPosition;
		}) => Promise<unknown>,
		triggerCharacters: readonly string[],
	) => HostDisposable;
	/** Registers a completion resolve handler. */
	registerCompletionResolveProvider: (
		handler: (item: unknown) => Promise<unknown>,
	) => HostDisposable;
	/** Registers a hover provider. */
	registerHoverProvider: (
		handler: (input: {
			document: EditorDocument;
			position: EditorPosition;
		}) => Promise<unknown>,
	) => HostDisposable;
	/** Registers a definition provider. */
	registerDefinitionProvider: (
		handler: (input: {
			document: EditorDocument;
			position: EditorPosition;
		}) => Promise<unknown>,
	) => HostDisposable;
	/** Registers a references provider. */
	registerReferencesProvider: (
		handler: (input: {
			document: EditorDocument;
			position: EditorPosition;
			includeDeclaration: boolean;
		}) => Promise<unknown>,
	) => HostDisposable;
	/** Registers a workspace symbol provider. */
	registerWorkspaceSymbolProvider: (
		handler: (query: string) => Promise<unknown>,
	) => HostDisposable;
	/** Registers a document symbol provider. */
	registerDocumentSymbolProvider: (
		handler: (document: EditorDocument) => Promise<unknown>,
	) => HostDisposable;
	/** Registers a code-lens provider. */
	registerCodeLensProvider: (handlers: {
		provide: (document: EditorDocument) => Promise<unknown>;
		resolve: (lens: unknown) => Promise<unknown>;
	}) => HostDisposable;
	/** Registers rename providers. */
	registerRenameProvider: (handlers: {
		prepare: (input: {
			document: EditorDocument;
			position: EditorPosition;
		}) => Promise<unknown>;
		rename: (input: {
			document: EditorDocument;
			position: EditorPosition;
			newName: string;
		}) => Promise<unknown>;
	}) => HostDisposable;
	/** Registers a command callback. */
	registerCommand: (
		commandId: string,
		handler: (...args: unknown[]) => void | Promise<void>,
	) => HostDisposable;
	/** Creates one diagnostics sink collection. */
	createDiagnosticsCollection: (name: string) => {
		set: (uri: string, diagnostics: readonly EditorDiagnostic[]) => void;
		clear: () => void;
		dispose: () => void;
	};
	/** Shows an informational notification. */
	showInformationMessage: (message: string) => unknown;
	/** Shows a warning notification. */
	showWarningMessage: (message: string) => unknown;
	/** Shows an error notification. */
	showErrorMessage: (message: string) => unknown;
}
