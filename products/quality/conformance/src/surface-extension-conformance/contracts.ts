import type {
	CompiledEntrypoint,
	CompiledSurfaceBinding,
} from "@gooi/app-spec-contracts/compiled";
import type { ConformanceCheckResultBase } from "@gooi/conformance-contracts/checks";
import type { ConformanceSuiteReportBase } from "@gooi/conformance-contracts/reports";
import type {
	CompiledSurfaceDispatchPlanSet,
	DispatchError,
} from "@gooi/surface-contracts/dispatch";
import type { SurfaceAdapter } from "@gooi/surface-runtime";

/**
 * Named conformance checks for surface extension readiness.
 */
export type SurfaceExtensionConformanceCheckId =
	| "adapter_extension_without_core_changes"
	| "typed_extension_failure_diagnostics"
	| "deterministic_extension_dispatch";

export type SurfaceExtensionConformanceCheckResult =
	ConformanceCheckResultBase<SurfaceExtensionConformanceCheckId>;

/**
 * Dispatch snapshot emitted by extension conformance checks.
 */
export interface SurfaceExtensionDispatchSnapshot {
	readonly surfaceId: string;
	readonly invocationHost: string;
	readonly entrypointKind: "query" | "mutation" | "route";
	readonly entrypointId: string;
	readonly boundInput: Readonly<Record<string, unknown>>;
}

/**
 * Surface extension conformance report.
 */
export interface SurfaceExtensionConformanceReport
	extends ConformanceSuiteReportBase<SurfaceExtensionConformanceCheckResult> {
	readonly snapshot?: SurfaceExtensionDispatchSnapshot;
	readonly diagnostics?: readonly DispatchError[];
}

/**
 * Input payload required for surface extension conformance checks.
 */
export interface RunSurfaceExtensionConformanceInput {
	readonly surfaceId: string;
	readonly dispatchPlans: CompiledSurfaceDispatchPlanSet;
	readonly entrypoints: Readonly<Record<string, CompiledEntrypoint>>;
	readonly bindings: Readonly<Record<string, CompiledSurfaceBinding>>;
	readonly extensionAdapter: SurfaceAdapter;
	readonly successIngress: unknown;
	readonly malformedIngress: unknown;
	readonly expectedBoundInput: Readonly<Record<string, unknown>>;
	readonly expectedEntrypointKind: "query" | "mutation" | "route";
	readonly expectedEntrypointId: string;
}
