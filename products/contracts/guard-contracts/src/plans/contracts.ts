/**
 * Canonical boundary contract API.
 */
import * as guard_plan from "./guard-plan";

export type {
	CompiledGuardDefinition,
	CompiledGuardPolicyPlan,
	CompiledInvariantDefinition,
	CompiledSemanticGuardDefinition,
	CompiledStructuralGuardDefinition,
	GuardOperand,
	GuardPolicy,
	GuardPrimitiveKind,
	GuardRuntimeEnvironment,
	GuardSourceRef,
	SemanticConfidence,
	SemanticJudgeUnavailableMode,
	SemanticSamplingPolicy,
	StructuralOperator,
} from "./guard-plan";
export const { defaultGuardPolicyPlan } = guard_plan;

export const plansContracts = Object.freeze({
	guardRuntimeEnvironmentSchema: guard_plan.guardRuntimeEnvironmentSchema,
	guardPrimitiveKindSchema: guard_plan.guardPrimitiveKindSchema,
	guardPolicySchema: guard_plan.guardPolicySchema,
	semanticConfidenceSchema: guard_plan.semanticConfidenceSchema,
	semanticJudgeUnavailableModeSchema:
		guard_plan.semanticJudgeUnavailableModeSchema,
	defaultGuardPolicyPlan: guard_plan.defaultGuardPolicyPlan,
});
