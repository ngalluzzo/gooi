/**
 * LOC-EXCEPTION: This declaration file intentionally centralizes the VS Code shim surface.
 */
declare module "vscode" {
	export type Disposable = { dispose: () => void };
	export type DocumentSelector = { language?: string; scheme?: string };

	export class Position {
		constructor(line: number, character: number);
		readonly line: number;
		readonly character: number;
	}

	export class Range {
		constructor(start: Position, end: Position);
		readonly start: Position;
		readonly end: Position;
	}

	export class Uri {
		readonly fsPath: string;
		toString(): string;
		static parse(value: string): Uri;
		static file(path: string): Uri;
	}

	export class Location {
		constructor(uri: Uri, range: Range);
	}

	export class Hover {
		constructor(contents: string | string[], range?: Range);
	}

	export enum CompletionItemKind {
		Text,
		Method,
		Function,
		Constructor,
		Field,
		Variable,
		Class,
		Interface,
		Module,
		Property,
		Unit,
		Value,
		Enum,
		Keyword,
		Snippet,
		Color,
		File,
		Reference,
		Folder,
		EnumMember,
		Constant,
		Struct,
		Event,
		Operator,
		TypeParameter,
	}

	export class CompletionItem {
		constructor(label: string, kind?: CompletionItemKind);
		label: string;
		kind?: CompletionItemKind;
		detail?: string;
		documentation?: string;
		insertText?: string;
		data?: unknown;
	}

	export class CodeLens {
		constructor(range: Range);
		range: Range;
		command?: { title: string; command: string; arguments?: unknown[] };
		data?: unknown;
	}

	export class Diagnostic {
		constructor(range: Range, message: string, severity: DiagnosticSeverity);
		code?: string | number;
	}

	export enum DiagnosticSeverity {
		Error,
		Warning,
		Information,
		Hint,
	}

	export class WorkspaceEdit {
		replace(uri: Uri, range: Range, newText: string): void;
	}

	export enum SymbolKind {
		File,
		Module,
		Namespace,
		Package,
		Class,
		Method,
		Property,
		Field,
		Constructor,
		Enum,
		Interface,
		Function,
		Variable,
		Constant,
		String,
		Number,
		Boolean,
		Array,
		Object,
		Key,
		Null,
		EnumMember,
		Struct,
		Event,
		Operator,
		TypeParameter,
	}

	export class DocumentSymbol {
		constructor(
			name: string,
			detail: string,
			kind: SymbolKind,
			range: Range,
			selectionRange: Range,
		);
	}

	export class SymbolInformation {
		constructor(
			name: string,
			kind: SymbolKind,
			containerName: string,
			location: Location,
		);
	}

	export interface TextDocument {
		readonly uri: Uri;
		readonly version: number;
		getText: () => string;
	}

	export interface TextDocumentChangeEvent {
		readonly document: TextDocument;
	}

	export interface WorkspaceFolder {
		readonly uri: Uri;
	}

	export interface WorkspaceConfiguration {
		get: <T>(section: string) => T | undefined;
	}

	export interface DiagnosticCollection {
		set: (uri: Uri, diagnostics: readonly Diagnostic[]) => void;
		clear: () => void;
		dispose: () => void;
	}

	export const workspace: {
		readonly workspaceFolders: readonly WorkspaceFolder[] | undefined;
		getConfiguration: (section: string) => WorkspaceConfiguration;
		onDidOpenTextDocument: (
			handler: (document: TextDocument) => void,
		) => Disposable;
		onDidChangeTextDocument: (
			handler: (event: TextDocumentChangeEvent) => void,
		) => Disposable;
	};

	export const languages: {
		createDiagnosticCollection: (name: string) => DiagnosticCollection;
		registerCompletionItemProvider: (
			selector: DocumentSelector,
			provider: {
				provideCompletionItems: (
					document: TextDocument,
					position: Position,
				) => Promise<readonly CompletionItem[]>;
				resolveCompletionItem?: (
					item: CompletionItem,
				) => Promise<CompletionItem | unknown>;
			},
			...triggerCharacters: readonly string[]
		) => Disposable;
		registerHoverProvider: (
			selector: DocumentSelector,
			provider: {
				provideHover: (
					document: TextDocument,
					position: Position,
				) => Promise<Hover | undefined>;
			},
		) => Disposable;
		registerDefinitionProvider: (
			selector: DocumentSelector,
			provider: {
				provideDefinition: (
					document: TextDocument,
					position: Position,
				) => Promise<Location | undefined>;
			},
		) => Disposable;
		registerReferenceProvider: (
			selector: DocumentSelector,
			provider: {
				provideReferences: (
					document: TextDocument,
					position: Position,
				) => Promise<readonly Location[]>;
			},
		) => Disposable;
		registerWorkspaceSymbolProvider: (provider: {
			provideWorkspaceSymbols: (
				query: string,
			) => Promise<readonly SymbolInformation[]>;
		}) => Disposable;
		registerDocumentSymbolProvider: (
			selector: DocumentSelector,
			provider: {
				provideDocumentSymbols: (
					document: TextDocument,
				) => Promise<readonly DocumentSymbol[]>;
			},
		) => Disposable;
		registerCodeLensProvider: (
			selector: DocumentSelector,
			provider: {
				provideCodeLenses: (
					document: TextDocument,
				) => Promise<readonly CodeLens[]>;
				resolveCodeLens: (lens: CodeLens) => Promise<CodeLens>;
			},
		) => Disposable;
		registerRenameProvider: (
			selector: DocumentSelector,
			provider: {
				prepareRename: (
					document: TextDocument,
					position: Position,
				) => Promise<Range>;
				provideRenameEdits: (
					document: TextDocument,
					position: Position,
					newName: string,
				) => Promise<WorkspaceEdit>;
			},
		) => Disposable;
	};

	export const commands: {
		registerCommand: (
			commandId: string,
			handler: (...args: unknown[]) => unknown,
		) => Disposable;
	};

	export const window: {
		showInformationMessage: (message: string) => Promise<void>;
		showWarningMessage: (message: string) => Promise<void>;
		showErrorMessage: (message: string) => Promise<void>;
	};
}
