import type {
	CompiledEntrypointBundle,
	CompiledSurfaceBinding,
} from "@gooi/app-spec-contracts/compiled";
import type { CapabilityPortContract } from "@gooi/capability-contracts/capability-port";
import type { ConformanceCheckResultBase } from "@gooi/conformance-contracts/checks";
import type { ConformanceSuiteReportBase } from "@gooi/conformance-contracts/reports";
import type { PrincipalContext } from "@gooi/host-contracts/principal";
import type { KernelSemanticRuntimePort } from "@gooi/kernel-contracts/semantic-engine";
import type { SurfaceRequestPayload } from "@gooi/surface-contracts/surface-request";

/**
 * Named conformance checks for host port behavior.
 */
export type HostConformanceCheckId =
	| "entrypoint_host_identity_used"
	| "entrypoint_host_clock_used"
	| "entrypoint_missing_clock_rejected"
	| "entrypoint_missing_identity_rejected"
	| "entrypoint_missing_principal_rejected"
	| "entrypoint_missing_delegation_rejected"
	| "provider_host_clock_used"
	| "provider_activation_policy_used"
	| "provider_missing_clock_rejected"
	| "provider_missing_activation_policy_rejected"
	| "provider_missing_delegation_rejected"
	| "provider_missing_module_loader_rejected"
	| "provider_missing_module_integrity_rejected";

export type HostConformanceCheckResult =
	ConformanceCheckResultBase<HostConformanceCheckId>;

/**
 * Host conformance report for runtime orchestration.
 */
export interface HostConformanceReport
	extends ConformanceSuiteReportBase<HostConformanceCheckResult> {}

/**
 * Input payload required for host conformance checks.
 */
export interface RunHostConformanceInput {
	/** Compiled artifact bundle used for entrypoint checks. */
	readonly bundle: CompiledEntrypointBundle;
	/** Query binding used for entrypoint checks. */
	readonly queryBinding: CompiledSurfaceBinding;
	/** Query request payload expected to succeed. */
	readonly queryRequest: SurfaceRequestPayload;
	/** Principal expected to pass query access checks. */
	readonly principal: PrincipalContext;
	/** Domain runtime used for query execution checks. */
	readonly domainRuntime: KernelSemanticRuntimePort;
	/** Capability contract used for provider activation checks. */
	readonly providerContract: CapabilityPortContract;
	/** Host API version used for provider activation checks. */
	readonly providerHostApiVersion: string;
}
