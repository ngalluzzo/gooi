import type { ConformanceCheckResultBase } from "@gooi/conformance-contracts/checks";
import type { ConformanceSuiteReportBase } from "@gooi/conformance-contracts/reports";
import type { JsonValue } from "@gooi/contract-primitives/json";
import type { HostReplayStorePort } from "@gooi/host-contracts/replay";

/**
 * Named conformance checks for replay-store providers.
 */
export type ReplayStoreConformanceCheckId =
	| "load_miss_returns_null"
	| "save_then_load_roundtrip"
	| "scope_isolation_enforced"
	| "save_overwrites_existing_scope";

export type ReplayStoreConformanceCheckResult =
	ConformanceCheckResultBase<ReplayStoreConformanceCheckId>;

/**
 * Replay-store conformance report.
 */
export interface ReplayStoreConformanceReport
	extends ConformanceSuiteReportBase<ReplayStoreConformanceCheckResult> {}

/**
 * Input payload required for replay-store conformance checks.
 */
export interface RunReplayStoreConformanceInput {
	/** Factory for creating a replay-store port under test. */
	readonly createPort: <TResult = JsonValue>() => HostReplayStorePort<TResult>;
}
