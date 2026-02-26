import type {
	CompiledEntrypoint,
	CompiledSurfaceBinding,
} from "@gooi/spec-compiler/contracts";

/**
 * Native surface request payload buckets used by binding contracts.
 */
export interface SurfaceRequestPayload {
	/** Route/path variables from the active surface request. */
	readonly path?: Readonly<Record<string, unknown>>;
	/** Query string or URL search params. */
	readonly query?: Readonly<Record<string, unknown>>;
	/** Structured request body payload. */
	readonly body?: Readonly<Record<string, unknown>>;
	/** Positional command arguments for CLI surfaces. */
	readonly args?: Readonly<Record<string, unknown>>;
	/** Flag-based command options for CLI surfaces. */
	readonly flags?: Readonly<Record<string, unknown>>;
}

/**
 * Structured binding error payload.
 */
export interface BindingError {
	/** Stable error code for deterministic handling. */
	readonly code: "binding_error";
	/** Human-readable error message. */
	readonly message: string;
	/** Optional structured details for debugging and telemetry. */
	readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Result type used by surface binding execution.
 */
export type BindingResult<T> =
	| { readonly ok: true; readonly value: T }
	| { readonly ok: false; readonly error: BindingError };

/**
 * Input payload for deterministic surface binding execution.
 */
export interface BindSurfaceInputInput {
	/** Native request payload buckets from surface adapter. */
	readonly request: SurfaceRequestPayload;
	/** Compiled entrypoint contract for target invocation. */
	readonly entrypoint: CompiledEntrypoint;
	/** Compiled surface binding mapping to apply. */
	readonly binding: CompiledSurfaceBinding;
}
