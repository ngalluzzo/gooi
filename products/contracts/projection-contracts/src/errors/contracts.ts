/**
 * Canonical boundary contract API.
 */
import * as projection_errors from "./projection-errors";

export type {
	ProjectionErrorCode,
	ProjectionTypedError,
} from "./projection-errors";

export const errorsContracts = Object.freeze({
	projectionErrorCodeSchema: projection_errors.projectionErrorCodeSchema,
	createProjectionError: projection_errors.createProjectionError,
});
