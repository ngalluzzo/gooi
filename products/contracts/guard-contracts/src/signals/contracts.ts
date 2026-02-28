/**
 * Canonical boundary contract API.
 */
import * as guard_violation_signal from "./guard-violation-signal";

export type { GuardViolationSignalEnvelope } from "./guard-violation-signal";
export const { guardViolationSignalEnvelopeVersion } = guard_violation_signal;

export const signalsContracts = Object.freeze({
	guardViolationSignalEnvelopeVersion:
		guard_violation_signal.guardViolationSignalEnvelopeVersion,
});
