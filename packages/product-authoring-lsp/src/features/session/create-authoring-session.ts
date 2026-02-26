import type { AuthoringDiagnosticsEnvelope } from "@gooi/authoring-contracts/envelopes/diagnostics";
import type { AuthoringReadContext } from "../../contracts/read-context";
import {
	authoringDocumentLifecycleEventSchema,
	authoringSessionCompletionRequestSchema,
	authoringSessionWorkspaceSymbolRequestSchema,
	createAuthoringSessionRequestSchema,
} from "../../contracts/session-contracts";
import { listAuthoringCompletionItems } from "../completion/list-authoring-completion-items";
import { publishAuthoringDiagnostics } from "../diagnostics/publish-authoring-diagnostics";
import { searchAuthoringWorkspaceSymbols } from "../navigation/search-authoring-workspace-symbols";

interface AuthoringSessionState {
	context: AuthoringReadContext;
	version: number;
}

/**
 * Stateful authoring session used by integration and protocol tests.
 */
export interface AuthoringSession {
	/** Current authoritative document version. */
	readonly version: number;
	/** Current read context. */
	readonly context: AuthoringReadContext;
	/** Handles `didOpen` lifecycle events. */
	didOpen: (value: unknown) => void;
	/** Handles `didChange` lifecycle events. */
	didChange: (value: unknown) => void;
	/** Produces diagnostics from current session state. */
	publishDiagnostics: (value?: {
		generatedAt?: string;
	}) => AuthoringDiagnosticsEnvelope;
	/** Produces completion items from current session state. */
	completion: ReturnType<typeof listAuthoringCompletionItems> extends infer _
		? (value: unknown) => ReturnType<typeof listAuthoringCompletionItems>
		: never;
	/** Produces workspace symbol search results from current session state. */
	workspaceSymbols: ReturnType<
		typeof searchAuthoringWorkspaceSymbols
	> extends infer _
		? (value: unknown) => ReturnType<typeof searchAuthoringWorkspaceSymbols>
		: never;
}

/**
 * Creates a stateful authoring session with `didOpen` and `didChange` semantics.
 *
 * @param value - Untrusted create-session request.
 * @returns Authoring session API.
 *
 * @example
 * const session = createAuthoringSession({ context, initialVersion: 1 });
 */
export const createAuthoringSession = (value: unknown): AuthoringSession => {
	const request = createAuthoringSessionRequestSchema.parse(value);
	const state: AuthoringSessionState = {
		context: request.context,
		version: request.initialVersion,
	};

	const updateDocument = (eventValue: unknown): void => {
		const event = authoringDocumentLifecycleEventSchema.parse(eventValue);
		if (event.version <= state.version) {
			throw new Error(
				`Out-of-order didChange version '${event.version}' received; current version is '${state.version}'.`,
			);
		}
		state.context = {
			...state.context,
			documentText: event.documentText,
		};
		state.version = event.version;
	};

	return {
		get version() {
			return state.version;
		},
		get context() {
			return state.context;
		},
		didOpen: (eventValue: unknown) => {
			updateDocument(eventValue);
		},
		didChange: (eventValue: unknown) => {
			updateDocument(eventValue);
		},
		publishDiagnostics: (options?: { generatedAt?: string }) =>
			publishAuthoringDiagnostics({
				context: state.context,
				generatedAt: options?.generatedAt,
			}),
		completion: (completionValue: unknown) => {
			const completion =
				authoringSessionCompletionRequestSchema.parse(completionValue);
			return listAuthoringCompletionItems({
				context: state.context,
				position: completion.position,
			});
		},
		workspaceSymbols: (workspaceValue: unknown) => {
			const workspace =
				authoringSessionWorkspaceSymbolRequestSchema.parse(workspaceValue);
			return searchAuthoringWorkspaceSymbols({
				context: state.context,
				query: workspace.query,
			});
		},
	};
};
