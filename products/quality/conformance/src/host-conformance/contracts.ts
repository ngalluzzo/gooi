import type { CapabilityPortContract } from "@gooi/capability-contracts/capability-port";
import type { DomainRuntimePort } from "@gooi/entrypoint-runtime";
import type { PrincipalContext } from "@gooi/host-contracts/principal";
import type {
	CompiledEntrypointBundle,
	CompiledSurfaceBinding,
} from "@gooi/spec-compiler/contracts";
import type { SurfaceRequestPayload } from "@gooi/surface-contracts/surface-request";

/**
 * Named conformance checks for host port behavior.
 */
export type HostConformanceCheckId =
	| "entrypoint_host_identity_used"
	| "entrypoint_host_clock_used"
	| "provider_host_clock_used"
	| "provider_activation_policy_used";

/**
 * Result for one host conformance check.
 */
export interface HostConformanceCheckResult {
	/** Stable check identifier. */
	readonly id: HostConformanceCheckId;
	/** True when the check passed. */
	readonly passed: boolean;
	/** Human-readable check detail. */
	readonly detail: string;
}

/**
 * Host conformance report for runtime orchestration.
 */
export interface HostConformanceReport {
	/** Aggregate pass status. */
	readonly passed: boolean;
	/** Individual check outcomes. */
	readonly checks: readonly HostConformanceCheckResult[];
}

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
	readonly domainRuntime: DomainRuntimePort;
	/** Capability contract used for provider activation checks. */
	readonly providerContract: CapabilityPortContract;
	/** Host API version used for provider activation checks. */
	readonly providerHostApiVersion: string;
}
