import {
	type AuthoringProtocolRequest,
	type AuthoringProtocolRequestId,
	type AuthoringProtocolResponse,
	authoringProtocolCancelParamsSchema,
	authoringProtocolCodeLensResolveParamsSchema,
	authoringProtocolCompletionParamsSchema,
	authoringProtocolCompletionResolveParamsSchema,
	authoringProtocolPositionParamsSchema,
	authoringProtocolReferencesParamsSchema,
	authoringProtocolRenameParamsSchema,
	authoringProtocolRequestSchema,
	authoringProtocolResponseSchema,
} from "../../contracts/protocol-contracts";
import type { AuthoringReadContext } from "../../contracts/read-context";
import { listAuthoringCodeLenses } from "../actions/list-authoring-code-lenses";
import { resolveAuthoringCodeLens } from "../actions/resolve-authoring-code-lens";
import { listAuthoringCompletionItems } from "../completion/list-authoring-completion-items";
import { resolveAuthoringCompletionItem } from "../completion/resolve-authoring-completion-item";
import { getAuthoringDefinition } from "../navigation/get-authoring-definition";
import { getAuthoringHover } from "../navigation/get-authoring-hover";
import { getAuthoringReferences } from "../navigation/get-authoring-references";
import { listAuthoringDocumentSymbols } from "../navigation/list-authoring-document-symbols";
import { searchAuthoringWorkspaceSymbols } from "../navigation/search-authoring-workspace-symbols";
import { applyAuthoringRename } from "../rename/apply-authoring-rename";
import { prepareAuthoringRename } from "../rename/prepare-authoring-rename";
import { createAuthoringSession } from "../session/create-authoring-session";
/**
 * Authoring protocol server used by protocol E2E tests.
 */
export interface AuthoringProtocolServer {
	/** Handles one protocol request or notification. */
	handleMessage: (value: unknown) => AuthoringProtocolResponse;
}

/**
 * Optional lifecycle hooks used by protocol-level tests.
 */
export interface AuthoringProtocolServerHooks {
	/** Runs before a request is resolved. */
	readonly onRequestStart?: (input: {
		readonly request: AuthoringProtocolRequest;
		readonly sessionVersion: number;
		readonly cancel: (id: AuthoringProtocolRequestId) => void;
	}) => void;
	/** Runs after request computation and before response emission. */
	readonly onRequestResolved?: (input: {
		readonly request: AuthoringProtocolRequest;
		readonly sessionVersion: number;
		readonly cancel: (id: AuthoringProtocolRequestId) => void;
	}) => void;
}

/** Creates a protocol server that routes protocol methods to authoring handlers. */
export const createAuthoringProtocolServer = (input: {
	readonly context: AuthoringReadContext;
	readonly initialVersion?: number;
	readonly hooks?: AuthoringProtocolServerHooks;
}): AuthoringProtocolServer => {
	const session = createAuthoringSession({
		context: input.context,
		initialVersion: input.initialVersion ?? 1,
	});
	const cancelledRequests = new Set<string>();
	const toCancellationKey = (id: AuthoringProtocolRequestId): string =>
		typeof id === "number" ? `n:${id}` : `s:${id}`;
	const markCancelled = (id: AuthoringProtocolRequestId): void => {
		cancelledRequests.add(toCancellationKey(id));
	};
	const isCancelled = (id: AuthoringProtocolRequestId | null): boolean =>
		id !== null && cancelledRequests.has(toCancellationKey(id));
	const clearCancelled = (id: AuthoringProtocolRequestId | null): void => {
		if (id === null) {
			return;
		}
		cancelledRequests.delete(toCancellationKey(id));
	};

	const ok = (id: AuthoringProtocolResponse["id"], result: unknown) =>
		authoringProtocolResponseSchema.parse({ id, result });
	const fail = (
		id: AuthoringProtocolResponse["id"],
		message: string,
	): AuthoringProtocolResponse =>
		authoringProtocolResponseSchema.parse({ id, error: { message } });
	const failCancelled = (
		id: AuthoringProtocolResponse["id"],
	): AuthoringProtocolResponse => fail(id, "Request cancelled by client.");

	const runCancellableRequest = (
		request: AuthoringProtocolRequest,
		run: () => unknown,
	) => {
		if (isCancelled(request.id)) {
			clearCancelled(request.id);
			return failCancelled(request.id);
		}

		const requestVersion = session.version;
		input.hooks?.onRequestStart?.({
			request,
			sessionVersion: requestVersion,
			cancel: markCancelled,
		});
		if (isCancelled(request.id)) {
			clearCancelled(request.id);
			return failCancelled(request.id);
		}

		const result = run();
		input.hooks?.onRequestResolved?.({
			request,
			sessionVersion: requestVersion,
			cancel: markCancelled,
		});
		if (isCancelled(request.id)) {
			clearCancelled(request.id);
			return failCancelled(request.id);
		}
		if (session.version !== requestVersion) {
			return fail(
				request.id,
				`Request superseded by newer document version '${session.version}'.`,
			);
		}
		clearCancelled(request.id);
		return ok(request.id, result);
	};

	return {
		handleMessage: (value: unknown) => {
			const request = authoringProtocolRequestSchema.parse(value);
			try {
				switch (request.method) {
					case "$/cancelRequest": {
						const params = authoringProtocolCancelParamsSchema.parse(
							request.params,
						);
						markCancelled(params.id);
						return ok(request.id, null);
					}
					case "textDocument/didOpen": {
						session.didOpen(request.params);
						return ok(request.id, null);
					}
					case "textDocument/didChange": {
						session.didChange(request.params);
						return ok(request.id, null);
					}
					case "gooi/pullDiagnostics": {
						return runCancellableRequest(request, () =>
							session.publishDiagnostics(),
						);
					}
					case "textDocument/completion": {
						return runCancellableRequest(request, () => {
							const params = authoringProtocolCompletionParamsSchema.parse(
								request.params,
							);
							return listAuthoringCompletionItems({
								context: session.context,
								position: params.position,
							});
						});
					}
					case "completionItem/resolve": {
						return runCancellableRequest(request, () => {
							const params =
								authoringProtocolCompletionResolveParamsSchema.parse(
									request.params,
								);
							return resolveAuthoringCompletionItem({
								context: session.context,
								item: params.item,
							});
						});
					}
					case "textDocument/codeLens": {
						return runCancellableRequest(request, () =>
							listAuthoringCodeLenses({ context: session.context }),
						);
					}
					case "textDocument/documentSymbol": {
						return runCancellableRequest(request, () =>
							listAuthoringDocumentSymbols({ context: session.context }),
						);
					}
					case "codeLens/resolve": {
						return runCancellableRequest(request, () => {
							const params = authoringProtocolCodeLensResolveParamsSchema.parse(
								request.params,
							);
							return resolveAuthoringCodeLens({
								context: session.context,
								lens: params.lens,
							});
						});
					}
					case "textDocument/prepareRename": {
						return runCancellableRequest(request, () => {
							const params = authoringProtocolPositionParamsSchema.parse(
								request.params,
							);
							return prepareAuthoringRename({
								context: session.context,
								position: params.position,
							});
						});
					}
					case "textDocument/rename": {
						return runCancellableRequest(request, () => {
							const params = authoringProtocolRenameParamsSchema.parse(
								request.params,
							);
							return applyAuthoringRename({
								context: session.context,
								position: params.position,
								newName: params.newName,
							});
						});
					}
					case "textDocument/hover": {
						return runCancellableRequest(request, () => {
							const params = authoringProtocolPositionParamsSchema.parse(
								request.params,
							);
							return getAuthoringHover({
								context: session.context,
								position: params.position,
							});
						});
					}
					case "textDocument/definition": {
						return runCancellableRequest(request, () => {
							const params = authoringProtocolPositionParamsSchema.parse(
								request.params,
							);
							return getAuthoringDefinition({
								context: session.context,
								position: params.position,
							});
						});
					}
					case "textDocument/references": {
						return runCancellableRequest(request, () => {
							const params = authoringProtocolReferencesParamsSchema.parse(
								request.params,
							);
							return getAuthoringReferences({
								context: session.context,
								position: params.position,
								includeDeclaration: params.includeDeclaration,
							});
						});
					}
					case "workspace/symbol": {
						return runCancellableRequest(request, () => {
							const query =
								typeof request.params === "object" &&
								request.params !== null &&
								"query" in request.params &&
								typeof (request.params as { query: unknown }).query === "string"
									? (request.params as { query: string }).query
									: "";
							return searchAuthoringWorkspaceSymbols({
								context: session.context,
								query,
							});
						});
					}
				}
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown protocol error.";
				return fail(request.id, message);
			}
		},
	};
};
