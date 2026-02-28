import {
	type AuthoringProtocolRequest,
	type AuthoringProtocolResponse,
	authoringProtocolCancelParamsSchema,
	authoringProtocolCodeLensResolveParamsSchema,
	authoringProtocolCompletionParamsSchema,
	authoringProtocolCompletionResolveParamsSchema,
	authoringProtocolPositionParamsSchema,
	authoringProtocolReferencesParamsSchema,
	authoringProtocolRenameParamsSchema,
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

export interface AuthoringProtocolSessionLike {
	readonly version: number;
	readonly context: AuthoringReadContext;
	didOpen: (value: unknown) => void;
	didChange: (value: unknown) => void;
	publishDiagnostics: () => unknown;
}

export interface AuthoringProtocolRequestRouteInput {
	readonly request: AuthoringProtocolRequest;
	readonly session: AuthoringProtocolSessionLike;
	readonly ok: (
		id: AuthoringProtocolResponse["id"],
		result: unknown,
	) => AuthoringProtocolResponse;
	readonly runCancellableRequest: (
		request: AuthoringProtocolRequest,
		run: () => unknown,
	) => AuthoringProtocolResponse;
	readonly markCancelled: (id: string | number) => void;
}

/**
 * Routes one parsed protocol request to its feature handler.
 */
export const routeAuthoringProtocolRequest = (
	input: AuthoringProtocolRequestRouteInput,
): AuthoringProtocolResponse => {
	const { request, session, ok, runCancellableRequest, markCancelled } = input;

	switch (request.method) {
		case "$/cancelRequest": {
			const params = authoringProtocolCancelParamsSchema.parse(request.params);
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
		case "gooi/pullDiagnostics":
			return runCancellableRequest(request, () => session.publishDiagnostics());
		case "textDocument/completion":
			return runCancellableRequest(request, () => {
				const params = authoringProtocolCompletionParamsSchema.parse(
					request.params,
				);
				return listAuthoringCompletionItems({
					context: session.context,
					position: params.position,
				});
			});
		case "completionItem/resolve":
			return runCancellableRequest(request, () => {
				const params = authoringProtocolCompletionResolveParamsSchema.parse(
					request.params,
				);
				return resolveAuthoringCompletionItem({
					context: session.context,
					item: params.item,
				});
			});
		case "textDocument/codeLens":
			return runCancellableRequest(request, () =>
				listAuthoringCodeLenses({ context: session.context }),
			);
		case "textDocument/documentSymbol":
			return runCancellableRequest(request, () =>
				listAuthoringDocumentSymbols({ context: session.context }),
			);
		case "codeLens/resolve":
			return runCancellableRequest(request, () => {
				const params = authoringProtocolCodeLensResolveParamsSchema.parse(
					request.params,
				);
				return resolveAuthoringCodeLens({
					context: session.context,
					lens: params.lens,
				});
			});
		case "textDocument/prepareRename":
			return runCancellableRequest(request, () => {
				const params = authoringProtocolPositionParamsSchema.parse(
					request.params,
				);
				return prepareAuthoringRename({
					context: session.context,
					position: params.position,
				});
			});
		case "textDocument/rename":
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
		case "textDocument/hover":
			return runCancellableRequest(request, () => {
				const params = authoringProtocolPositionParamsSchema.parse(
					request.params,
				);
				return getAuthoringHover({
					context: session.context,
					position: params.position,
				});
			});
		case "textDocument/definition":
			return runCancellableRequest(request, () => {
				const params = authoringProtocolPositionParamsSchema.parse(
					request.params,
				);
				return getAuthoringDefinition({
					context: session.context,
					position: params.position,
				});
			});
		case "textDocument/references":
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
		case "workspace/symbol":
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
};
