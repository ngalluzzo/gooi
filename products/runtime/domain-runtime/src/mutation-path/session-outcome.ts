import {
	type DomainSessionOutcomeEnvelope,
	domainRuntimeEnvelopeVersion,
} from "../execution-core/envelopes";
import {
	createDomainRuntimeError,
	type DomainRuntimeTypedError,
} from "../execution-core/errors";
import type { DomainSessionOutcomePolicy } from "./contracts";

export type SessionOutcomeBuildResult =
	| { readonly ok: true; readonly value: DomainSessionOutcomeEnvelope }
	| { readonly ok: false; readonly error: DomainRuntimeTypedError };

/**
 * Resolves a deterministic session outcome envelope from action policy.
 */
export const buildSessionOutcome = (
	policy: DomainSessionOutcomePolicy,
	status: "success" | "failure",
): SessionOutcomeBuildResult => {
	const policyValue =
		status === "success" ? policy.onSuccess : policy.onFailure;
	if (policyValue === "clear") {
		return {
			ok: true,
			value: {
				envelopeVersion: domainRuntimeEnvelopeVersion,
				status: "cleared",
				reason: status,
			},
		};
	}
	if (policyValue === "preserve") {
		return {
			ok: true,
			value: {
				envelopeVersion: domainRuntimeEnvelopeVersion,
				status: "preserved",
				reason: status,
			},
		};
	}
	return {
		ok: false,
		error: createDomainRuntimeError(
			"session_outcome_error",
			"Session outcome policy contains an unsupported value.",
			{
				policyValue,
				status,
			},
		),
	};
};
