import type {
	BindingPlan,
	DeploymentLockfile,
} from "@gooi/binding/binding-plan";
import type { CapabilityPortContract } from "@gooi/capability-contracts/capability-port";
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

/**
 * Result for one reachability parity check.
 */
export interface ReachabilityParityCheckResult {
	/** Stable check identifier. */
	readonly id: ReachabilityParityCheckId;
	/** True when the check passed. */
	readonly passed: boolean;
	/** Human-readable check detail. */
	readonly detail: string;
}

/**
 * Typed diagnostics emitted when parity invariants are violated.
 */
export interface ReachabilityParityDiagnostic {
	/** Stable diagnostic code. */
	readonly code: "conformance_reachability_parity_error";
	/** Human-readable message for failed invariant. */
	readonly message: string;
	/** Source path for check-scoped diagnostics. */
	readonly path: string;
}

/**
 * Aggregate report for reachability parity suite.
 */
export interface ReachabilityParityReport {
	/** Aggregate pass status. */
	readonly passed: boolean;
	/** Individual check outcomes. */
	readonly checks: readonly ReachabilityParityCheckResult[];
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
	readonly input: unknown;
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
