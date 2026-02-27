import type { JsonObject } from "@gooi/contract-primitives/json";

/**
 * Structured host port error payload.
 */
export interface HostPortError {
	/** Stable host error code. */
	readonly code: string;
	/** Human-readable error message. */
	readonly message: string;
	/** Optional structured error details. */
	readonly details?: JsonObject;
}

/**
 * Result type used by host ports.
 */
export type HostPortResult<T> =
	| { readonly ok: true; readonly value: T }
	| { readonly ok: false; readonly error: HostPortError };

/**
 * Creates a successful host-port result.
 */
export const hostOk = <T>(value: T): HostPortResult<T> => ({ ok: true, value });

/**
 * Creates a failed host-port result.
 */
export const hostFail = (
	code: string,
	message: string,
	details?: JsonObject,
): HostPortResult<never> => ({
	ok: false,
	error: details === undefined ? { code, message } : { code, message, details },
});
