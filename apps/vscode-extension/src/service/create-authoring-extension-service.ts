import type {
	EditorDiagnostic,
	EditorDocument,
	EditorPosition,
} from "../contracts/host-ports";
import type { AuthoringLanguageClient } from "../contracts/language-client";

const toEditorDiagnostics = (
	diagnostics: ReadonlyArray<{
		code: string;
		message: string;
		severity: "error" | "warning" | "info";
		range: {
			start: { line: number; character: number };
			end: { line: number; character: number };
		};
	}>,
): EditorDiagnostic[] =>
	diagnostics.map((diagnostic) => ({
		code: diagnostic.code,
		message: diagnostic.message,
		severity: diagnostic.severity,
		range: diagnostic.range,
	}));

/**
 * Document-aware service facade used by host adapters.
 */
export interface AuthoringExtensionService {
	/** Handles document-open lifecycle state updates. */
	didOpen: (document: EditorDocument) => void;
	/** Handles document-change lifecycle state updates. */
	didChange: (document: EditorDocument) => void;
	/** Pulls diagnostics mapped to editor-facing payloads. */
	pullEditorDiagnostics: () => {
		documentUri: string;
		diagnostics: EditorDiagnostic[];
	};
	/** Lists completion items for one position. */
	completion: (
		position: EditorPosition,
	) => ReturnType<AuthoringLanguageClient["completion"]>;
	/** Resolves one completion item. */
	resolveCompletion: (
		item: unknown,
	) => ReturnType<AuthoringLanguageClient["resolveCompletion"]>;
	/** Lists unresolved code lenses. */
	codeLenses: () => ReturnType<AuthoringLanguageClient["codeLenses"]>;
	/** Resolves one code lens. */
	resolveCodeLens: (
		lens: unknown,
	) => ReturnType<AuthoringLanguageClient["resolveCodeLens"]>;
	/** Resolves hover payload at a position. */
	hover: (
		position: EditorPosition,
	) => ReturnType<AuthoringLanguageClient["hover"]>;
	/** Resolves definition location at a position. */
	definition: (
		position: EditorPosition,
	) => ReturnType<AuthoringLanguageClient["definition"]>;
	/** Resolves references at a position. */
	references: (
		position: EditorPosition,
		includeDeclaration: boolean,
	) => ReturnType<AuthoringLanguageClient["references"]>;
	/** Lists document symbols. */
	documentSymbols: () => ReturnType<AuthoringLanguageClient["documentSymbols"]>;
	/** Searches workspace symbols by query. */
	workspaceSymbols: (
		query: string,
	) => ReturnType<AuthoringLanguageClient["workspaceSymbols"]>;
	/** Prepares rename edits at a position. */
	prepareRename: (
		position: EditorPosition,
	) => ReturnType<AuthoringLanguageClient["prepareRename"]>;
	/** Applies rename edits. */
	rename: (
		position: EditorPosition,
		newName: string,
	) => ReturnType<AuthoringLanguageClient["rename"]>;
}

/**
 * Creates the extension service facade over a protocol-backed language client.
 *
 * @param input - Client dependency.
 * @returns Authoring extension service.
 *
 * @example
 * const service = createAuthoringExtensionService({ client });
 */
export const createAuthoringExtensionService = (input: {
	client: AuthoringLanguageClient;
}): AuthoringExtensionService => ({
	didOpen: (document) => {
		input.client.didOpen(document);
	},
	didChange: (document) => {
		input.client.didChange(document);
	},
	pullEditorDiagnostics: () => {
		const diagnosticsEnvelope = input.client.pullDiagnostics();
		return {
			documentUri: diagnosticsEnvelope.documentUri,
			diagnostics: toEditorDiagnostics(diagnosticsEnvelope.diagnostics),
		};
	},
	completion: (position) => input.client.completion(position),
	resolveCompletion: (item) => input.client.resolveCompletion(item),
	codeLenses: () => input.client.codeLenses(),
	resolveCodeLens: (lens) => input.client.resolveCodeLens(lens),
	hover: (position) => input.client.hover(position),
	definition: (position) => input.client.definition(position),
	references: (position, includeDeclaration) =>
		input.client.references({ position, includeDeclaration }),
	documentSymbols: () => input.client.documentSymbols(),
	workspaceSymbols: (query) => input.client.workspaceSymbols(query),
	prepareRename: (position) => input.client.prepareRename(position),
	rename: (position, newName) => input.client.rename({ position, newName }),
});
