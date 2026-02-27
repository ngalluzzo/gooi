import { z } from "zod";

export const guardRuntimeEnvironmentSchema = z.enum([
	"production",
	"simulation",
	"ci",
]);

export type GuardRuntimeEnvironment = z.infer<
	typeof guardRuntimeEnvironmentSchema
>;

export const guardPrimitiveKindSchema = z.enum([
	"collection",
	"action",
	"signal",
	"flow",
	"projection",
]);

export type GuardPrimitiveKind = z.infer<typeof guardPrimitiveKindSchema>;

export const guardPolicySchema = z.enum([
	"abort",
	"fail_action",
	"log_and_continue",
	"emit_violation",
]);

export type GuardPolicy = z.infer<typeof guardPolicySchema>;

export const semanticConfidenceSchema = z.enum(["high", "medium", "low"]);

export type SemanticConfidence = z.infer<typeof semanticConfidenceSchema>;

export const semanticJudgeUnavailableModeSchema = z.enum(["warn", "error"]);

export type SemanticJudgeUnavailableMode = z.infer<
	typeof semanticJudgeUnavailableModeSchema
>;

export interface GuardSourceRef {
	readonly primitiveKind: GuardPrimitiveKind;
	readonly primitiveId: string;
	readonly path: string;
}

export type GuardOperand =
	| {
			readonly kind: "path";
			readonly path: string;
	  }
	| {
			readonly kind: "literal";
			readonly value: unknown;
	  };

export type StructuralOperator =
	| "exists"
	| "eq"
	| "neq"
	| "gt"
	| "gte"
	| "lt"
	| "lte";

export interface CompiledStructuralGuardDefinition {
	readonly guardId: string;
	readonly description: string;
	readonly operator: StructuralOperator;
	readonly left: GuardOperand;
	readonly right?: GuardOperand;
}

export interface SemanticSamplingPolicy {
	readonly production: number;
	readonly simulation: number;
	readonly ci: number;
}

export interface CompiledSemanticGuardDefinition {
	readonly guardId: string;
	readonly description: string;
	readonly rule: string;
	readonly confidence?: SemanticConfidence;
	readonly sampling?: Partial<SemanticSamplingPolicy>;
}

export interface CompiledGuardDefinition {
	readonly sourceRef: GuardSourceRef;
	readonly onFail: GuardPolicy;
	readonly structural: readonly CompiledStructuralGuardDefinition[];
	readonly semantic?: readonly CompiledSemanticGuardDefinition[];
}

export interface CompiledInvariantDefinition {
	readonly sourceRef: GuardSourceRef;
	readonly onFail: Exclude<GuardPolicy, "fail_action">;
	readonly structural: readonly CompiledStructuralGuardDefinition[];
}

export interface CompiledGuardPolicyPlan {
	readonly semanticSamplingDefault: SemanticSamplingPolicy;
	readonly semanticJudgeUnavailable: {
		readonly production: SemanticJudgeUnavailableMode;
		readonly simulation: SemanticJudgeUnavailableMode;
		readonly ci: SemanticJudgeUnavailableMode;
	};
}

export const defaultGuardPolicyPlan: CompiledGuardPolicyPlan = {
	semanticSamplingDefault: {
		production: 0.05,
		simulation: 1,
		ci: 1,
	},
	semanticJudgeUnavailable: {
		production: "warn",
		simulation: "warn",
		ci: "error",
	},
};
