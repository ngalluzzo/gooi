import type { AuthoringDiagnosticsEnvelope } from "@gooi/authoring-contracts/envelopes/diagnostics";
import type {
	AuthoringCodeLensListResult,
	AuthoringCodeLensResolveResult,
} from "@gooi/language-server/contracts/code-lens";
import type {
	AuthoringCompletionList,
	AuthoringCompletionResolveResult,
} from "@gooi/language-server/contracts/completion";
import type {
	AuthoringDefinitionResult,
	AuthoringDocumentSymbolResult,
	AuthoringHoverResult,
	AuthoringReferencesResult,
	AuthoringWorkspaceSymbolResult,
} from "@gooi/language-server/contracts/navigation-results";
import type {
	AuthoringPrepareRenameResult,
	AuthoringRenameResult,
} from "@gooi/language-server/contracts/rename";

import type { EditorDocument, EditorPosition } from "./host-ports";

/**
 * Protocol-backed client used by the extension service.
 */
export interface AuthoringLanguageClient {
	/** Opens a document in the underlying authoring session. */
	didOpen: (document: EditorDocument) => void;
	/** Applies a document change to the underlying authoring session. */
	didChange: (document: EditorDocument) => void;
	/** Pulls deterministic diagnostics from the authoring session. */
	pullDiagnostics: () => AuthoringDiagnosticsEnvelope;
	/** Lists completion candidates for one position. */
	completion: (position: EditorPosition) => AuthoringCompletionList;
	/** Resolves completion metadata for one item. */
	resolveCompletion: (item: unknown) => AuthoringCompletionResolveResult;
	/** Lists unresolved code lenses for the active document. */
	codeLenses: () => AuthoringCodeLensListResult;
	/** Resolves one code lens command payload. */
	resolveCodeLens: (lens: unknown) => AuthoringCodeLensResolveResult;
	/** Resolves hover content for one position. */
	hover: (position: EditorPosition) => AuthoringHoverResult;
	/** Resolves definition for one position. */
	definition: (position: EditorPosition) => AuthoringDefinitionResult;
	/** Resolves references for one position. */
	references: (input: {
		position: EditorPosition;
		includeDeclaration: boolean;
	}) => AuthoringReferencesResult;
	/** Lists document symbols for the active document. */
	documentSymbols: () => AuthoringDocumentSymbolResult;
	/** Searches workspace symbols by query string. */
	workspaceSymbols: (query: string) => AuthoringWorkspaceSymbolResult;
	/** Performs rename preflight checks. */
	prepareRename: (position: EditorPosition) => AuthoringPrepareRenameResult;
	/** Applies rename edits for one position and new identifier. */
	rename: (input: {
		position: EditorPosition;
		newName: string;
	}) => AuthoringRenameResult;
}
