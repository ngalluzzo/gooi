import type { ConformanceCheckResultBase } from "@gooi/conformance-contracts/checks";
import type { ConformanceSuiteReportBase } from "@gooi/conformance-contracts/reports";

export const tieredConformanceStrategyVersion = "1.0.0" as const;

export type TieredConformanceTierId = "smoke" | "full" | "expanded";

export type TieredConformanceGateRole =
	| "pull_request_gate"
	| "release_candidate_gate"
	| "pre_release_expansion";

export interface TieredConformanceSuiteDefinition {
	readonly suiteId: string;
	readonly maxRuntimeMs: number;
	readonly maxFlakyRate: number;
	readonly required: boolean;
}

export interface TieredConformanceTierDefinition {
	readonly version: typeof tieredConformanceStrategyVersion;
	readonly tierId: TieredConformanceTierId;
	readonly gateRole: TieredConformanceGateRole;
	readonly suites: readonly TieredConformanceSuiteDefinition[];
}

export interface TieredConformanceSuiteExecutionResult {
	readonly suiteId: string;
	readonly passed: boolean;
	readonly runtimeMs: number;
	readonly flakyRate: number;
	readonly detail: string;
}

export interface RunTieredConformanceInput {
	readonly definition: TieredConformanceTierDefinition;
	readonly executeSuite: (
		suite: TieredConformanceSuiteDefinition,
	) => Promise<TieredConformanceSuiteExecutionResult>;
}

export type TieredConformanceCheckId =
	| "tier_definition_complete"
	| "required_suites_pass"
	| "runtime_thresholds_enforced"
	| "flaky_rate_thresholds_enforced";

export type TieredConformanceCheckResult =
	ConformanceCheckResultBase<TieredConformanceCheckId>;

export interface TieredConformanceReport
	extends ConformanceSuiteReportBase<TieredConformanceCheckResult> {
	readonly tierId: TieredConformanceTierId;
	readonly gateRole: TieredConformanceGateRole;
	readonly version: typeof tieredConformanceStrategyVersion;
	readonly suites: readonly TieredConformanceSuiteExecutionResult[];
}
