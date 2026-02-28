import {
	type AuthoringProtocolRequest,
	type AuthoringProtocolRequestId,
	type AuthoringProtocolResponse,
	authoringProtocolRequestSchema,
	authoringProtocolResponseSchema,
} from "../../contracts/protocol-contracts";
import type { AuthoringReadContext } from "../../contracts/read-context";
import { createAuthoringSession } from "../session/create-authoring-session";
import { routeAuthoringProtocolRequest } from "./route-authoring-protocol-request";

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
		if (id !== null) {
			cancelledRequests.delete(toCancellationKey(id));
		}
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
	): AuthoringProtocolResponse => {
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
				return routeAuthoringProtocolRequest({
					request,
					session,
					ok,
					runCancellableRequest,
					markCancelled,
				});
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown protocol error.";
				return fail(request.id, message);
			}
		},
	};
};
