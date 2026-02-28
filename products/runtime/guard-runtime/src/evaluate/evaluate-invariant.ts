import {
	type GuardViolationRecord,
	type InvariantEvaluationEnvelope,
	invariantEvaluationEnvelopeVersion,
} from "@gooi/guard-contracts/envelopes";
import {
	createGuardError,
	type GuardTypedError,
} from "@gooi/guard-contracts/errors";
import type { CompiledInvariantDefinition } from "@gooi/guard-contracts/plans";
import { applyInvariantPolicy } from "./apply-guard-policy";
import { evaluateStructuralRule } from "./structural";

const invariantPrimitiveAllowed = new Set(["collection", "projection"]);

export const evaluateInvariant = (input: {
	readonly definition: CompiledInvariantDefinition;
	readonly context: Readonly<Record<string, unknown>>;
}): InvariantEvaluationEnvelope => {
	const diagnostics: GuardTypedError[] = [];
	if (
		!invariantPrimitiveAllowed.has(input.definition.sourceRef.primitiveKind)
	) {
		const error = createGuardError(
			"guard_policy_error",
			"Invariant definition must target collection or projection primitives.",
			input.definition.sourceRef,
		);
		diagnostics.push(error);
		return {
			envelopeVersion: invariantEvaluationEnvelopeVersion,
			ok: false,
			violations: [],
			policyOutcome: { applied: "none", blockingViolationCount: 0 },
			emittedSignals: [],
			diagnostics,
			error,
		};
	}

	const violations: GuardViolationRecord[] = [];
	for (const rule of input.definition.structural) {
		const passed = evaluateStructuralRule(input.context, rule);
		if (passed) {
			continue;
		}
		violations.push({
			guardId: rule.guardId,
			description: rule.description,
			tier: "structural",
			blocking: true,
		});
	}

	return applyInvariantPolicy({
		definition: input.definition,
		context: input.context,
		violations,
		diagnostics,
	});
};
