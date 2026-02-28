import type { ConformanceCheckResultBase } from "@gooi/conformance-contracts/checks";
import type { ConformanceSuiteReportBase } from "@gooi/conformance-contracts/reports";
import type {
	RenderAdapterCompatibilityDiagnostic,
	RendererAdapterCapabilityProfile,
} from "@gooi/render-contracts/adapter";
import type { CompiledViewRenderIR } from "@gooi/render-contracts/ir";

/**
 * Named conformance checks for renderer adapter compatibility behavior.
 */
export type RenderAdapterConformanceCheckId =
	| "supported_component_path"
	| "unsupported_component_path";

export type RenderAdapterConformanceCheckResult =
	ConformanceCheckResultBase<RenderAdapterConformanceCheckId>;

/**
 * Renderer adapter conformance report payload.
 */
export interface RenderAdapterConformanceReport
	extends ConformanceSuiteReportBase<RenderAdapterConformanceCheckResult> {
	readonly diagnostics?: readonly RenderAdapterCompatibilityDiagnostic[];
}

/**
 * Input payload required for renderer adapter conformance checks.
 */
export interface RunRenderAdapterConformanceInput {
	readonly viewRenderIR: CompiledViewRenderIR;
	readonly supportedCapabilities: RendererAdapterCapabilityProfile;
	readonly unsupportedCapabilities: RendererAdapterCapabilityProfile;
}
