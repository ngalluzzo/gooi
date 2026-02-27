import { z } from "zod";

/**
 * Stable error codes emitted by the domain runtime contract.
 */
export const domainRuntimeErrorCodeSchema = z.enum([
	"action_not_found_error",
	"query_not_found_error",
	"action_step_input_error",
	"capability_contract_error",
	"capability_invocation_error",
	"collection_invariant_error",
	"action_guard_error",
	"signal_guard_error",
	"flow_guard_error",
	"session_outcome_error",
]);

/**
 * Domain runtime error code.
 */
export type DomainRuntimeErrorCode = z.infer<
	typeof domainRuntimeErrorCodeSchema
>;

/**
 * Typed domain runtime error payload.
 */
export interface DomainRuntimeTypedError {
	/** Stable machine-readable domain runtime error code. */
	readonly code: DomainRuntimeErrorCode;
	/** Human-readable error message. */
	readonly message: string;
	/** Optional structured diagnostics payload. */
	readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Creates one typed domain runtime error payload.
 */
export const createDomainRuntimeError = (
	code: DomainRuntimeErrorCode,
	message: string,
	details?: Readonly<Record<string, unknown>>,
): DomainRuntimeTypedError => ({
	code,
	message,
	...(details === undefined ? {} : { details }),
});
