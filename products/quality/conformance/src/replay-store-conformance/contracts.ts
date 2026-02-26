import type { HostReplayStorePort } from "@gooi/host-contracts/replay";

/**
 * Named conformance checks for replay-store providers.
 */
export type ReplayStoreConformanceCheckId =
	| "load_miss_returns_null"
	| "save_then_load_roundtrip"
	| "scope_isolation_enforced"
	| "save_overwrites_existing_scope";

/**
 * Result for one replay-store conformance check.
 */
export interface ReplayStoreConformanceCheckResult {
	/** Stable check identifier. */
	readonly id: ReplayStoreConformanceCheckId;
	/** True when the check passed. */
	readonly passed: boolean;
	/** Human-readable check detail. */
	readonly detail: string;
}

/**
 * Replay-store conformance report.
 */
export interface ReplayStoreConformanceReport {
	/** Aggregate pass status. */
	readonly passed: boolean;
	/** Individual check outcomes. */
	readonly checks: readonly ReplayStoreConformanceCheckResult[];
}

/**
 * Input payload required for replay-store conformance checks.
 */
export interface RunReplayStoreConformanceInput {
	/** Factory for creating a replay-store port under test. */
	readonly createPort: <TResult = unknown>() => HostReplayStorePort<TResult>;
}
