import type { CompiledEntrypointBundle } from "@gooi/app-spec-contracts/compiled";
import type { ConformanceCheckResultBase } from "@gooi/conformance-contracts/checks";
import type { ConformanceSuiteReportBase } from "@gooi/conformance-contracts/reports";
import type { PrincipalContext } from "@gooi/host-contracts/principal";
import type { KernelSemanticRuntimePort } from "@gooi/kernel-contracts/semantic-engine";
import type {
	RenderDiagnosticEnvelope,
	RenderEvaluationEnvelope,
} from "@gooi/render-contracts/envelopes";

/**
 * Named conformance checks for dispatch-to-render pipeline behavior.
 */
export type DispatchRenderConformanceCheckId =
	| "route_dispatch_renders_output"
	| "typed_error_envelopes_preserved"
	| "deterministic_render_output";

export type DispatchRenderConformanceCheckResult =
	ConformanceCheckResultBase<DispatchRenderConformanceCheckId>;

/**
 * Conformance report for dispatch-to-render behavior.
 */
export interface DispatchRenderConformanceReport
	extends ConformanceSuiteReportBase<DispatchRenderConformanceCheckResult> {
	readonly render?: RenderEvaluationEnvelope;
	readonly diagnostics?: readonly RenderDiagnosticEnvelope[];
}

/**
 * Input payload required for dispatch-to-render conformance checks.
 */
export interface RunDispatchRenderConformanceInput {
	readonly bundle: CompiledEntrypointBundle;
	readonly domainRuntime: KernelSemanticRuntimePort;
	readonly authorizedPrincipal: PrincipalContext;
	readonly unauthorizedPrincipal: PrincipalContext;
	readonly surfaceId: string;
	readonly screenId: string;
	readonly routeIngress: unknown;
	readonly malformedIngress: unknown;
}
