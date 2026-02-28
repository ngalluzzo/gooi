/**
 * Canonical boundary contract API.
 */
import * as guard_envelopes from "./guard-envelopes";

export type {
	GuardEvaluationEnvelope,
	GuardEvaluationMeta,
	GuardPolicyOutcome,
	GuardViolationRecord,
	InvariantEvaluationEnvelope,
} from "./guard-envelopes";
export const {
	guardEvaluationEnvelopeVersion,
	invariantEvaluationEnvelopeVersion,
} = guard_envelopes;

export const envelopesContracts = Object.freeze({
	guardEvaluationEnvelopeVersion:
		guard_envelopes.guardEvaluationEnvelopeVersion,
	invariantEvaluationEnvelopeVersion:
		guard_envelopes.invariantEvaluationEnvelopeVersion,
});
