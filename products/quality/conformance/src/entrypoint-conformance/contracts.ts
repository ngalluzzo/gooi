import type {
	CompiledEntrypointBundle,
	CompiledSurfaceBinding,
} from "@gooi/app-spec-contracts/compiled";
import type { ConformanceCheckResultBase } from "@gooi/conformance-contracts/checks";
import type { ConformanceSuiteReportBase } from "@gooi/conformance-contracts/reports";
import type {
	DomainRuntimePort,
	runEntrypoint,
} from "@gooi/entrypoint-runtime";
import type { PrincipalContext } from "@gooi/host-contracts/principal";
import type { SurfaceRequestPayload } from "@gooi/surface-contracts/surface-request";

/**
 * Named conformance checks for entrypoint runtime behavior.
 */
export type EntrypointConformanceCheckId =
	| "query_executes"
	| "access_denied_enforced"
	| "binding_error_enforced"
	| "refresh_subscription_matched"
	| "idempotency_replay_enforced"
	| "idempotency_conflict_enforced";

export type EntrypointConformanceCheckResult =
	ConformanceCheckResultBase<EntrypointConformanceCheckId>;

/**
 * Conformance report for one compiled entrypoint bundle.
 */
export interface EntrypointConformanceReport
	extends ConformanceSuiteReportBase<EntrypointConformanceCheckResult> {
	/** Artifact hash used by all executed checks. */
	readonly artifactHash: string;
	/** Last successful mutation result for debugging. */
	readonly lastMutationResult?: Awaited<ReturnType<typeof runEntrypoint>>;
}

/**
 * Input payload required for entrypoint runtime conformance.
 */
export interface RunEntrypointConformanceInput {
	/** Compiled artifact bundle under test. */
	readonly bundle: CompiledEntrypointBundle;
	/** Query binding used in conformance checks. */
	readonly queryBinding: CompiledSurfaceBinding;
	/** Mutation binding used in conformance checks. */
	readonly mutationBinding: CompiledSurfaceBinding;
	/** Domain runtime port implementation under test. */
	readonly domainRuntime: DomainRuntimePort;
	/** Principal expected to pass access checks. */
	readonly authorizedPrincipal: PrincipalContext;
	/** Principal expected to fail access checks. */
	readonly unauthorizedPrincipal: PrincipalContext;
	/** Query request payload expected to succeed. */
	readonly queryRequest: SurfaceRequestPayload;
	/** Mutation request payload expected to succeed. */
	readonly mutationRequest: SurfaceRequestPayload;
	/** Mutation payload expected to conflict under reused idempotency key. */
	readonly mutationConflictRequest: SurfaceRequestPayload;
}
