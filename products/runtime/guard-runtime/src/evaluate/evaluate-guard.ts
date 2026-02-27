import {
	type GuardEvaluationEnvelope,
	type GuardViolationRecord,
	guardEvaluationEnvelopeVersion,
} from "@gooi/guard-contracts/envelopes/guard-envelopes";
import type { GuardTypedError } from "@gooi/guard-contracts/errors/guard-errors";
import { createGuardError } from "@gooi/guard-contracts/errors/guard-errors";
import {
	type CompiledGuardDefinition,
	type CompiledGuardPolicyPlan,
	defaultGuardPolicyPlan,
	type GuardRuntimeEnvironment,
} from "@gooi/guard-contracts/plans/guard-plan";
import type { SemanticJudgePort } from "@gooi/guard-contracts/ports/semantic-judge-port";
import { applyGuardPolicy } from "../policies/apply-guard-policy";
import { evaluateInvariant } from "./evaluate-invariant";
import { evaluateSemanticTier } from "./semantic";
import { evaluateStructuralRule } from "./structural";

interface EvaluateGuardInput {
	readonly definition: CompiledGuardDefinition;
	readonly context: Readonly<Record<string, unknown>>;
	readonly environment?: GuardRuntimeEnvironment;
	readonly policyPlan?: CompiledGuardPolicyPlan;
	readonly semanticJudge?: SemanticJudgePort;
	readonly samplingSeed?: string;
}

const semanticSupportedPrimitives = new Set(["action", "signal", "flow"]);

const resolveEnvironment = (
	environment: GuardRuntimeEnvironment | undefined,
): GuardRuntimeEnvironment => environment ?? "production";

const toSemanticUnavailableDiagnostic = (input: {
	readonly definition: CompiledGuardDefinition;
	readonly environment: GuardRuntimeEnvironment;
}) =>
	createGuardError(
		"semantic_guard_unavailable_error",
		"Semantic guard evaluation requires a bound semantic judge capability.",
		input.definition.sourceRef,
		{ environment: input.environment },
	);

/**
 * Evaluates one guard definition with structural-first, semantic-second ordering.
 */
export const evaluateGuard = async (
	input: EvaluateGuardInput,
): Promise<GuardEvaluationEnvelope> => {
	const environment = resolveEnvironment(input.environment);
	const policy = input.policyPlan ?? defaultGuardPolicyPlan;
	const diagnostics: GuardTypedError[] = [];
	const semanticDefinitions = input.definition.semantic ?? [];

	if (
		semanticDefinitions.length > 0 &&
		!semanticSupportedPrimitives.has(input.definition.sourceRef.primitiveKind)
	) {
		const error = createGuardError(
			"guard_policy_error",
			"Semantic guard tier is unsupported for this primitive kind.",
			input.definition.sourceRef,
			{ primitiveKind: input.definition.sourceRef.primitiveKind },
		);
		return {
			envelopeVersion: guardEvaluationEnvelopeVersion,
			ok: false,
			violations: [],
			policyOutcome: { applied: "none", blockingViolationCount: 0 },
			emittedSignals: [],
			diagnostics: [error],
			meta: {
				environment,
				structuralEvaluated: 0,
				semanticEvaluated: 0,
				semanticSkipped: 0,
			},
			error,
		};
	}

	const violations: GuardViolationRecord[] = [];
	let structuralEvaluated = 0;
	for (const rule of input.definition.structural) {
		structuralEvaluated += 1;
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

	if (violations.length === 0 && semanticDefinitions.length > 0) {
		const semanticOutcome = await evaluateSemanticTier({
			definitions: semanticDefinitions,
			environment,
			policy,
			context: input.context,
			...(input.semanticJudge === undefined
				? {}
				: { judge: input.semanticJudge }),
			samplingSeed:
				input.samplingSeed ??
				`${input.definition.sourceRef.primitiveKind}:${input.definition.sourceRef.primitiveId}`,
		});
		for (const result of semanticOutcome.results) {
			if (result.passed) {
				continue;
			}
			violations.push({
				guardId: result.guardId,
				description: result.description,
				tier: "semantic",
				blocking: result.blocking,
				...(result.details === undefined ? {} : { details: result.details }),
			});
		}

		if (semanticOutcome.unavailable) {
			diagnostics.push(
				toSemanticUnavailableDiagnostic({
					definition: input.definition,
					environment,
				}),
			);
		}

		const envelope = applyGuardPolicy({
			definition: input.definition,
			context: input.context,
			violations,
			diagnostics,
			meta: {
				environment,
				structuralEvaluated,
				semanticEvaluated: semanticOutcome.evaluated,
				semanticSkipped: semanticOutcome.skipped,
			},
		});
		if (
			!envelope.ok &&
			envelope.error?.code === "action_guard_error" &&
			diagnostics.some(
				(diagnostic) => diagnostic.code === "semantic_guard_unavailable_error",
			)
		) {
			const semanticUnavailable = diagnostics.find(
				(diagnostic) => diagnostic.code === "semantic_guard_unavailable_error",
			);
			return {
				...envelope,
				...(semanticUnavailable === undefined
					? {}
					: { error: semanticUnavailable }),
			};
		}
		return envelope;
	}

	return applyGuardPolicy({
		definition: input.definition,
		context: input.context,
		violations,
		diagnostics,
		meta: {
			environment,
			structuralEvaluated,
			semanticEvaluated: 0,
			semanticSkipped: semanticDefinitions.length,
		},
	});
};

export { evaluateInvariant };
