/**
 * Canonical boundary contract API.
 */
import * as result from "./result";

export type { HostPortError, HostPortResult } from "./result";
export const { hostOk, hostFail } = result;

export const resultContracts = Object.freeze({
	hostOk: result.hostOk,
	hostFail: result.hostFail,
});
