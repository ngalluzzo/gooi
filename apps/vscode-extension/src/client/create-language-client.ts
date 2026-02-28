import {
	type AuthoringDiagnosticsEnvelope,
	envelopesContracts,
} from "@gooi/authoring-contracts/envelopes";
import {
	authoringCodeLensListResultSchema,
	authoringCodeLensResolveResultSchema,
} from "@gooi/language-server/contracts/code-lens";
import {
	authoringCompletionListSchema,
	authoringCompletionResolveResultSchema,
} from "@gooi/language-server/contracts/completion";
import {
	authoringDefinitionResultSchema,
	authoringDocumentSymbolResultSchema,
	authoringHoverResultSchema,
	authoringReferencesResultSchema,
	authoringWorkspaceSymbolResultSchema,
} from "@gooi/language-server/contracts/navigation-results";
import {
	authoringPrepareRenameResultSchema,
	authoringRenameResultSchema,
} from "@gooi/language-server/contracts/rename";
import { createAuthoringProtocolServer } from "@gooi/language-server/features/protocol/server";
import type { EditorDocument, EditorPosition } from "../contracts/host-ports";
import type { AuthoringLanguageClient } from "../contracts/language-client";

const toErrorMessage = (response: {
	error: { message: string } | undefined;
}): string => response.error?.message ?? "Unknown authoring protocol failure.";

const assertResult = (response: {
	result?: unknown;
	error: { message: string } | undefined;
}): unknown => {
	if (response.error !== undefined) {
		throw new Error(toErrorMessage(response));
	}
	return response.result;
};

/**
 * Creates a protocol-backed language client for extension feature handlers.
 *
 * @param input - Initial authoring context and initial document version.
 * @returns Authoring language client.
 *
 * @example
 * const client = createLanguageClient({ context, initialVersion: 1 });
 */
export const createLanguageClient = (input: {
	context: Parameters<typeof createAuthoringProtocolServer>[0]["context"];
	initialVersion?: number;
}): AuthoringLanguageClient => {
	const server = createAuthoringProtocolServer(
		input.initialVersion === undefined
			? { context: input.context }
			: { context: input.context, initialVersion: input.initialVersion },
	);
	let nextId = 1;

	const notify = (method: string, params: unknown): void => {
		const response = server.handleMessage({ id: null, method, params });
		if (response.error !== undefined) {
			throw new Error(toErrorMessage({ error: response.error }));
		}
	};

	const request = (method: string, params: unknown): unknown => {
		const response = server.handleMessage({ id: nextId, method, params });
		nextId += 1;
		return assertResult({
			result: response.result,
			error: response.error,
		});
	};

	const lifecyclePayload = (document: EditorDocument) => ({
		version: document.version,
		documentText: document.text,
	});

	const positionPayload = (position: EditorPosition) => ({ position });

	return {
		didOpen: (document) => {
			notify("textDocument/didOpen", lifecyclePayload(document));
		},
		didChange: (document) => {
			notify("textDocument/didChange", lifecyclePayload(document));
		},
		pullDiagnostics: (): AuthoringDiagnosticsEnvelope =>
			envelopesContracts.parseAuthoringDiagnosticsEnvelope(
				request("gooi/pullDiagnostics", {}),
			),
		completion: (position) =>
			authoringCompletionListSchema.parse(
				request("textDocument/completion", positionPayload(position)),
			),
		resolveCompletion: (item) =>
			authoringCompletionResolveResultSchema.parse(
				request("completionItem/resolve", { item }),
			),
		codeLenses: () =>
			authoringCodeLensListResultSchema.parse(
				request("textDocument/codeLens", {}),
			),
		resolveCodeLens: (lens) =>
			authoringCodeLensResolveResultSchema.parse(
				request("codeLens/resolve", { lens }),
			),
		hover: (position) =>
			authoringHoverResultSchema.parse(
				request("textDocument/hover", positionPayload(position)),
			),
		definition: (position) =>
			authoringDefinitionResultSchema.parse(
				request("textDocument/definition", positionPayload(position)),
			),
		references: (params) =>
			authoringReferencesResultSchema.parse(
				request("textDocument/references", {
					position: params.position,
					includeDeclaration: params.includeDeclaration,
				}),
			),
		documentSymbols: () =>
			authoringDocumentSymbolResultSchema.parse(
				request("textDocument/documentSymbol", {}),
			),
		workspaceSymbols: (query) =>
			authoringWorkspaceSymbolResultSchema.parse(
				request("workspace/symbol", { query }),
			),
		prepareRename: (position) =>
			authoringPrepareRenameResultSchema.parse(
				request("textDocument/prepareRename", positionPayload(position)),
			),
		rename: (params) =>
			authoringRenameResultSchema.parse(
				request("textDocument/rename", {
					position: params.position,
					newName: params.newName,
				}),
			),
	};
};
