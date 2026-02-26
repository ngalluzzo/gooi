import type {
	CompiledEntrypoint,
	CompiledSurfaceBinding,
} from "@gooi/spec-compiler/contracts";
import { z } from "zod";
import type { SurfaceRequestPayload } from "../surface-request/surface-request";

/**
 * Runtime schema for structured surface binding errors.
 */
export const bindingErrorSchema = z.object({
	code: z.literal("binding_error"),
	message: z.string().min(1),
	details: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Structured binding error payload.
 */
export type BindingError = z.infer<typeof bindingErrorSchema>;

/**
 * Runtime schema for generic surface binding results.
 */
export const bindingResultSchema = z.union([
	z.object({ ok: z.literal(true), value: z.unknown() }),
	z.object({ ok: z.literal(false), error: bindingErrorSchema }),
]);

/**
 * Result type used by surface binding execution.
 */
export type BindingResult<T> =
	| { readonly ok: true; readonly value: T }
	| { readonly ok: false; readonly error: BindingError };

/**
 * Parses one untrusted generic surface binding result.
 */
export const parseBindingResult = (value: unknown): BindingResult<unknown> =>
	bindingResultSchema.parse(value);

/**
 * Parses one untrusted surface binding error payload.
 */
export const parseBindingError = (value: unknown): BindingError =>
	bindingErrorSchema.parse(value);

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
