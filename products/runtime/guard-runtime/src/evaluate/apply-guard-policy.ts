import type {
	GuardEvaluationEnvelope,
	GuardViolationRecord,
	InvariantEvaluationEnvelope,
} from "@gooi/guard-contracts/envelopes/guard-envelopes";
import { createGuardError } from "@gooi/guard-contracts/errors/guard-errors";
import type {
	CompiledGuardDefinition,
	CompiledInvariantDefinition,
	GuardPolicy,
} from "@gooi/guard-contracts/plans/guard-plan";
import {
	type GuardViolationSignalEnvelope,
	guardViolationSignalEnvelopeVersion,
} from "@gooi/guard-contracts/signals/guard-violation-signal";
import { sha256, stableStringify } from "@gooi/stable-json";

const errorCodeForPrimitive = (
	primitiveKind: CompiledGuardDefinition["sourceRef"]["primitiveKind"],
):
	| "action_guard_error"
	| "signal_guard_error"
	| "flow_guard_error"
	| "projection_guard_error"
	| "collection_invariant_error" => {
	if (primitiveKind === "action") {
		return "action_guard_error";
	}
	if (primitiveKind === "signal") {
		return "signal_guard_error";
	}
	if (primitiveKind === "flow") {
		return "flow_guard_error";
	}
	if (primitiveKind === "projection") {
		return "projection_guard_error";
	}
	return "collection_invariant_error";
};

const toViolationSignals = (input: {
	readonly policy: GuardPolicy;
	readonly sourceRef: CompiledGuardDefinition["sourceRef"];
	readonly violations: readonly GuardViolationRecord[];
	readonly context: Readonly<Record<string, unknown>>;
}): readonly GuardViolationSignalEnvelope[] => {
	if (input.policy !== "emit_violation") {
		return [];
	}
	const contextSnapshotRef = sha256(stableStringify(input.context));
	return input.violations
		.filter((violation) => violation.blocking)
		.map((violation) => ({
			envelopeVersion: guardViolationSignalEnvelopeVersion,
			signalId: "guard.violated",
			primitiveKind: input.sourceRef.primitiveKind,
			primitiveId: input.sourceRef.primitiveId,
			guardTier: violation.tier,
			guardId: violation.guardId,
			description: violation.description,
			policyApplied: input.policy,
			contextSnapshotRef,
			sourceRef: input.sourceRef,
		}));
};

export const applyGuardPolicy = (input: {
	readonly definition: CompiledGuardDefinition;
	readonly context: Readonly<Record<string, unknown>>;
	readonly violations: readonly GuardViolationRecord[];
	readonly diagnostics: GuardEvaluationEnvelope["diagnostics"];
	readonly meta: GuardEvaluationEnvelope["meta"];
}): GuardEvaluationEnvelope => {
	const blocking = input.violations.filter((violation) => violation.blocking);
	if (blocking.length === 0) {
		return {
			envelopeVersion: "1.0.0",
			ok: true,
			violations: input.violations,
			policyOutcome: { applied: "none", blockingViolationCount: 0 },
			emittedSignals: [],
			diagnostics: input.diagnostics,
			meta: input.meta,
		};
	}

	const policy = input.definition.onFail;
	if (policy === "abort" || policy === "fail_action") {
		return {
			envelopeVersion: "1.0.0",
			ok: false,
			violations: input.violations,
			policyOutcome: {
				applied: policy,
				blockingViolationCount: blocking.length,
			},
			emittedSignals: [],
			diagnostics: input.diagnostics,
			meta: input.meta,
			error: createGuardError(
				errorCodeForPrimitive(input.definition.sourceRef.primitiveKind),
				"Guard policy aborted primitive execution.",
				input.definition.sourceRef,
				{
					blockingGuardIds: blocking.map((violation) => violation.guardId),
					policy,
				},
			),
		};
	}

	return {
		envelopeVersion: "1.0.0",
		ok: true,
		violations: input.violations,
		policyOutcome: { applied: policy, blockingViolationCount: blocking.length },
		emittedSignals: toViolationSignals({
			policy,
			sourceRef: input.definition.sourceRef,
			violations: input.violations,
			context: input.context,
		}),
		diagnostics: input.diagnostics,
		meta: input.meta,
	};
};

export const applyInvariantPolicy = (input: {
	readonly definition: CompiledInvariantDefinition;
	readonly context: Readonly<Record<string, unknown>>;
	readonly violations: readonly GuardViolationRecord[];
	readonly diagnostics: InvariantEvaluationEnvelope["diagnostics"];
}): InvariantEvaluationEnvelope => {
	const blocking = input.violations.filter((violation) => violation.blocking);
	if (blocking.length === 0) {
		return {
			envelopeVersion: "1.0.0",
			ok: true,
			violations: input.violations,
			policyOutcome: { applied: "none", blockingViolationCount: 0 },
			emittedSignals: [],
			diagnostics: input.diagnostics,
		};
	}

	const policy = input.definition.onFail;
	if (policy === "abort") {
		return {
			envelopeVersion: "1.0.0",
			ok: false,
			violations: input.violations,
			policyOutcome: {
				applied: policy,
				blockingViolationCount: blocking.length,
			},
			emittedSignals: [],
			diagnostics: input.diagnostics,
			error: createGuardError(
				errorCodeForPrimitive(input.definition.sourceRef.primitiveKind),
				"Invariant policy aborted write execution.",
				input.definition.sourceRef,
				{
					blockingGuardIds: blocking.map((violation) => violation.guardId),
					policy,
				},
			),
		};
	}

	return {
		envelopeVersion: "1.0.0",
		ok: true,
		violations: input.violations,
		policyOutcome: { applied: policy, blockingViolationCount: blocking.length },
		emittedSignals:
			policy === "emit_violation"
				? toViolationSignals({
						policy,
						sourceRef: input.definition.sourceRef,
						violations: input.violations,
						context: input.context,
					})
				: [],
		diagnostics: input.diagnostics,
	};
};
