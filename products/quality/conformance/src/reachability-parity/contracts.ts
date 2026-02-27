import type { CapabilityPortContract } from "@gooi/capability-contracts/capability-port";
import type { ConformanceCheckResultBase } from "@gooi/conformance-contracts/checks";
import type { ConformanceDiagnosticRecordBase } from "@gooi/conformance-contracts/diagnostics";
import type { ConformanceSuiteReportBase } from "@gooi/conformance-contracts/reports";
import type { JsonValue } from "@gooi/contract-primitives/json";
import type { BindingPlan } from "@gooi/marketplace-contracts/binding-plan/contracts";
import type { DeploymentLockfile } from "@gooi/marketplace-contracts/lockfile/contracts";
import type {
	PrincipalContext,
	ProviderModule,
	ProviderRuntimeHostPorts,
} from "@gooi/provider-runtime";

/**
 * Named conformance checks for local/delegated reachability parity.
 */
export type ReachabilityParityCheckId =
	| "local_execution_succeeds"
	| "delegated_execution_succeeds"
	| "output_parity"
	| "effect_parity"
	| "reachability_trace_present";

export type ReachabilityParityCheckResult =
	ConformanceCheckResultBase<ReachabilityParityCheckId>;

/**
 * Typed diagnostics emitted when parity invariants are violated.
 */
export interface ReachabilityParityDiagnostic
	extends ConformanceDiagnosticRecordBase<"conformance_reachability_parity_error"> {}

/**
 * Aggregate report for reachability parity suite.
 */
export interface ReachabilityParityReport
	extends ConformanceSuiteReportBase<ReachabilityParityCheckResult> {
	/** Typed diagnostics for any parity violations. */
	readonly diagnostics: readonly ReachabilityParityDiagnostic[];
}

/**
 * Input payload for running local/delegated parity checks.
 */
export interface RunReachabilityParitySuiteInput {
	/** Provider module under test. */
	readonly providerModule: ProviderModule;
	/** Host API version used for both local and delegated runs. */
	readonly hostApiVersion: string;
	/** Capability contract exercised by parity checks. */
	readonly contract: CapabilityPortContract;
	/** Capability invocation input shared by local and delegated runs. */
	readonly input: JsonValue;
	/** Binding plan used for local execution path. */
	readonly localBindingPlan: BindingPlan;
	/** Lockfile used for local execution path. */
	readonly localLockfile: DeploymentLockfile;
	/** Binding plan used for delegated execution path. */
	readonly delegatedBindingPlan: BindingPlan;
	/** Lockfile used for delegated execution path. */
	readonly delegatedLockfile: DeploymentLockfile;
	/** Host ports used for delegated execution path. */
	readonly delegatedHostPorts: ProviderRuntimeHostPorts;
	/** Optional principal override for invocation envelope. */
	readonly principal?: PrincipalContext;
	/** Optional invocation timestamp override. */
	readonly now?: string;
}
