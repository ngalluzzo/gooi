import type {
	GuardEvaluationEnvelope,
	InvariantEvaluationEnvelope,
} from "@gooi/guard-contracts/envelopes/guard-envelopes";
import type {
	CompiledGuardDefinition,
	CompiledInvariantDefinition,
} from "@gooi/guard-contracts/plans/guard-plan";
import type { SemanticJudgePort } from "@gooi/guard-contracts/ports/semantic-judge-port";

export type GuardConformanceCheckId =
	| "layered_matrix_enforced"
	| "structural_before_semantic"
	| "violation_policy_outcomes_typed"
	| "semantic_sampling_confidence_ci"
	| "missing_judge_degrades_per_contract";

export interface GuardConformanceCheckResult {
	readonly id: GuardConformanceCheckId;
	readonly passed: boolean;
	readonly detail: string;
}

export interface GuardConformanceReport {
	readonly passed: boolean;
	readonly checks: readonly GuardConformanceCheckResult[];
}

export interface RunGuardConformanceInput {
	readonly collectionInvariant: CompiledInvariantDefinition;
	readonly actionGuard: CompiledGuardDefinition;
	readonly signalGuard: CompiledGuardDefinition;
	readonly flowGuard: CompiledGuardDefinition;
	readonly projectionGuard: CompiledInvariantDefinition;
	readonly evaluateBoundaryMatrix: (input: {
		readonly collectionInvariant: CompiledInvariantDefinition;
		readonly actionGuard: CompiledGuardDefinition;
		readonly signalGuard: CompiledGuardDefinition;
		readonly flowGuard: CompiledGuardDefinition;
		readonly projectionGuard: CompiledInvariantDefinition;
	}) => Promise<{
		readonly collectionInvariantBlocked: boolean;
		readonly actionGuardPassed: boolean;
		readonly signalGuardPassed: boolean;
		readonly flowGuardPassed: boolean;
		readonly projectionGuardPassed: boolean;
	}>;
	readonly evaluateInvariant: (input: {
		readonly definition: CompiledInvariantDefinition;
		readonly context: Readonly<Record<string, unknown>>;
	}) => InvariantEvaluationEnvelope;
	readonly evaluateGuard: (input: {
		readonly definition: CompiledGuardDefinition;
		readonly context: Readonly<Record<string, unknown>>;
		readonly environment?: "production" | "simulation" | "ci";
		readonly semanticJudge?: SemanticJudgePort;
		readonly samplingSeed?: string;
	}) => Promise<GuardEvaluationEnvelope>;
}
