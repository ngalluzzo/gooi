/**
 * Canonical boundary contract API.
 */
import * as guard_errors from "./guard-errors";

export type { GuardErrorCode, GuardTypedError } from "./guard-errors";
export const { guardErrorCodeSchema } = guard_errors;
export const { createGuardError } = guard_errors;

export const errorsContracts = Object.freeze({
	guardErrorCodeSchema: guard_errors.guardErrorCodeSchema,
	createGuardError: guard_errors.createGuardError,
});
