import type { ConformanceCheckResultBase } from "@gooi/conformance-contracts/checks";
import type { ConformanceSuiteReportBase } from "@gooi/conformance-contracts/reports";
import type { CompiledViewRenderIR } from "@gooi/render-contracts/ir";
import type { RenderRefreshConsistencyDiagnostic } from "@gooi/render-contracts/refresh";
import type { RefreshTrigger } from "@gooi/surface-contracts/envelope";

/**
 * Named conformance checks for render refresh lifecycle behavior.
 */
export type RenderRefreshConformanceCheckId =
	| "refresh_signal_consumption"
	| "refresh_order_determinism"
	| "runtime_projection_consistency"
	| "consistency_diagnostic_on_drift";

export type RenderRefreshConformanceCheckResult =
	ConformanceCheckResultBase<RenderRefreshConformanceCheckId>;

/**
 * Render refresh conformance report payload.
 */
export interface RenderRefreshConformanceReport
	extends ConformanceSuiteReportBase<RenderRefreshConformanceCheckResult> {
	readonly diagnostics?: readonly RenderRefreshConsistencyDiagnostic[];
}

/**
 * Input payload required for render refresh conformance checks.
 */
export interface RunRenderRefreshConformanceInput {
	readonly viewRenderIR: CompiledViewRenderIR;
	readonly refreshTriggers: readonly RefreshTrigger[];
	readonly runtimeAffectedQueryIds: readonly string[];
	readonly driftedRuntimeAffectedQueryIds: readonly string[];
}
