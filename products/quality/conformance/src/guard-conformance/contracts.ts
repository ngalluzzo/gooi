import type { ConformanceCheckResultBase } from "@gooi/conformance-contracts/checks";
import type { ConformanceSuiteReportBase } from "@gooi/conformance-contracts/reports";
import type { JsonObject } from "@gooi/contract-primitives/json";
import type {
	GuardEvaluationEnvelope,
	InvariantEvaluationEnvelope,
} from "@gooi/guard-contracts/envelopes";
import type {
	CompiledGuardDefinition,
	CompiledInvariantDefinition,
} from "@gooi/guard-contracts/plans";
import type { SemanticJudgePort } from "@gooi/guard-contracts/ports";

export type GuardConformanceCheckId =
	| "layered_matrix_enforced"
	| "structural_before_semantic"
	| "violation_policy_outcomes_typed"
	| "semantic_sampling_confidence_ci"
	| "missing_judge_degrades_per_contract";

export type GuardConformanceCheckResult =
	ConformanceCheckResultBase<GuardConformanceCheckId>;

export interface GuardConformanceReport
	extends ConformanceSuiteReportBase<GuardConformanceCheckResult> {}

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
		readonly context: JsonObject;
	}) => InvariantEvaluationEnvelope;
	readonly evaluateGuard: (input: {
		readonly definition: CompiledGuardDefinition;
		readonly context: JsonObject;
		readonly environment?: "production" | "simulation" | "ci";
		readonly semanticJudge?: SemanticJudgePort;
		readonly samplingSeed?: string;
	}) => Promise<GuardEvaluationEnvelope>;
}
