import { z } from "zod";
import type { ProjectionSourceRef } from "../plans/projection-plan";

/**
 * Stable projection runtime error codes.
 */
export const projectionErrorCodeSchema = z.enum([
	"projection_plan_error",
	"projection_provider_error",
	"projection_history_capability_error",
	"projection_history_gap_error",
	"projection_as_of_error",
	"projection_signal_migration_error",
	"projection_rebuild_required_error",
	"projection_pagination_error",
	"projection_guard_error",
]);

/**
 * Projection runtime error code.
 */
export type ProjectionErrorCode = z.infer<typeof projectionErrorCodeSchema>;

/**
 * Typed projection runtime error envelope payload.
 */
export interface ProjectionTypedError {
	/** Stable machine-readable code. */
	readonly code: ProjectionErrorCode;
	/** Human-readable message. */
	readonly message: string;
	/** Source reference for authored projection/query context. */
	readonly sourceRef: ProjectionSourceRef;
	/** Optional structured details payload. */
	readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Creates a projection runtime typed error payload.
 */
export const createProjectionError = (
	code: ProjectionErrorCode,
	message: string,
	sourceRef: ProjectionSourceRef,
	details?: Readonly<Record<string, unknown>>,
): ProjectionTypedError => ({
	code,
	message,
	sourceRef,
	...(details === undefined ? {} : { details }),
});
