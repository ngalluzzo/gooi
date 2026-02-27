import {
	createProjectionError,
	type ProjectionTypedError,
} from "@gooi/projection-contracts/errors/projection-errors";
import type { ProjectionSourceRef } from "@gooi/projection-contracts/plans/projection-plan";

/**
 * Creates a projection plan error with source reference.
 */
export const createPlanError = (
	message: string,
	sourceRef: ProjectionSourceRef,
	details?: Readonly<Record<string, unknown>>,
): ProjectionTypedError =>
	createProjectionError("projection_plan_error", message, sourceRef, details);

/**
 * Creates a projection pagination error with source reference.
 */
export const createPaginationError = (
	message: string,
	sourceRef: ProjectionSourceRef,
	details?: Readonly<Record<string, unknown>>,
): ProjectionTypedError =>
	createProjectionError(
		"projection_pagination_error",
		message,
		sourceRef,
		details,
	);

/**
 * Creates a projection provider error with source reference.
 */
export const createProviderError = (
	message: string,
	sourceRef: ProjectionSourceRef,
	details?: Readonly<Record<string, unknown>>,
): ProjectionTypedError =>
	createProjectionError(
		"projection_provider_error",
		message,
		sourceRef,
		details,
	);
