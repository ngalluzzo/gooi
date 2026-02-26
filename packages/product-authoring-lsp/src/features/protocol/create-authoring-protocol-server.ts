import {
	type AuthoringProtocolResponse,
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
/** Creates a protocol server that routes protocol methods to authoring handlers. */
export const createAuthoringProtocolServer = (input: {
	readonly context: AuthoringReadContext;
	readonly initialVersion?: number;
}): AuthoringProtocolServer => {
	const session = createAuthoringSession({
		context: input.context,
		initialVersion: input.initialVersion ?? 1,
	});
	const ok = (id: AuthoringProtocolResponse["id"], result: unknown) =>
		authoringProtocolResponseSchema.parse({ id, result });
	const fail = (
		id: AuthoringProtocolResponse["id"],
		message: string,
	): AuthoringProtocolResponse =>
		authoringProtocolResponseSchema.parse({ id, error: { message } });

	return {
		handleMessage: (value: unknown) => {
			const request = authoringProtocolRequestSchema.parse(value);
			try {
				switch (request.method) {
					case "textDocument/didOpen": {
						session.didOpen(request.params);
						return ok(request.id, null);
					}
					case "textDocument/didChange": {
						session.didChange(request.params);
						return ok(request.id, null);
					}
					case "gooi/pullDiagnostics": {
						return ok(request.id, session.publishDiagnostics());
					}
					case "textDocument/completion": {
						const params = authoringProtocolCompletionParamsSchema.parse(
							request.params,
						);
						return ok(
							request.id,
							listAuthoringCompletionItems({
								context: session.context,
								position: params.position,
							}),
						);
					}
					case "completionItem/resolve": {
						const params = authoringProtocolCompletionResolveParamsSchema.parse(
							request.params,
						);
						return ok(
							request.id,
							resolveAuthoringCompletionItem({
								context: session.context,
								item: params.item,
							}),
						);
					}
					case "textDocument/codeLens": {
						return ok(
							request.id,
							listAuthoringCodeLenses({ context: session.context }),
						);
					}
					case "codeLens/resolve": {
						const params = authoringProtocolCodeLensResolveParamsSchema.parse(
							request.params,
						);
						return ok(
							request.id,
							resolveAuthoringCodeLens({
								context: session.context,
								lens: params.lens,
							}),
						);
					}
					case "textDocument/prepareRename": {
						const params = authoringProtocolPositionParamsSchema.parse(
							request.params,
						);
						return ok(
							request.id,
							prepareAuthoringRename({
								context: session.context,
								position: params.position,
							}),
						);
					}
					case "textDocument/rename": {
						const params = authoringProtocolRenameParamsSchema.parse(
							request.params,
						);
						return ok(
							request.id,
							applyAuthoringRename({
								context: session.context,
								position: params.position,
								newName: params.newName,
							}),
						);
					}
					case "textDocument/hover": {
						const params = authoringProtocolPositionParamsSchema.parse(
							request.params,
						);
						return ok(
							request.id,
							getAuthoringHover({
								context: session.context,
								position: params.position,
							}),
						);
					}
					case "textDocument/definition": {
						const params = authoringProtocolPositionParamsSchema.parse(
							request.params,
						);
						return ok(
							request.id,
							getAuthoringDefinition({
								context: session.context,
								position: params.position,
							}),
						);
					}
					case "textDocument/references": {
						const params = authoringProtocolReferencesParamsSchema.parse(
							request.params,
						);
						return ok(
							request.id,
							getAuthoringReferences({
								context: session.context,
								position: params.position,
								includeDeclaration: params.includeDeclaration,
							}),
						);
					}
					case "workspace/symbol": {
						const query =
							typeof request.params === "object" &&
							request.params !== null &&
							"query" in request.params &&
							typeof (request.params as { query: unknown }).query === "string"
								? (request.params as { query: string }).query
								: "";
						return ok(
							request.id,
							searchAuthoringWorkspaceSymbols({
								context: session.context,
								query,
							}),
						);
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
