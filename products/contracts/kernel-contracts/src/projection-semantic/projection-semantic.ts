import type { JsonObject } from "@gooi/contract-primitives/json";
import type { GuardViolationRecord } from "@gooi/guard-contracts/envelopes";
import type { GuardTypedError } from "@gooi/guard-contracts/errors";
import type { GuardViolationSignalEnvelope } from "@gooi/guard-contracts/signals";
import type { ProjectionTypedError } from "@gooi/projection-contracts/errors";

/**
 * Canonical page metadata emitted by projection semantic execution.
 */
export interface ProjectionSemanticPageMeta {
	readonly mode: "page";
	readonly page: number;
	readonly pageSize: number;
	readonly totalRows: number;
	readonly totalPages: number;
}

/**
 * Canonical timeline metadata emitted by timeline semantic execution.
 */
export interface ProjectionSemanticTimelineMeta {
	readonly rebuildStatus: "in_progress" | "complete" | "failed" | "stale";
	readonly rebuildProgress: number | null;
	readonly rebuildStartedAt: string | null;
	readonly historyComplete: boolean;
	readonly asOfApplied: string | null;
}

/**
 * Projection guard evaluation metadata produced by semantic execution.
 */
export interface ProjectionSemanticGuardMeta {
	readonly evaluatedRows: number;
	readonly violationCount: number;
	readonly diagnosticCount: number;
	readonly emittedViolationSignalCount: number;
	readonly violations: readonly GuardViolationRecord[];
	readonly diagnostics: readonly GuardTypedError[];
	readonly emittedViolationSignals: readonly GuardViolationSignalEnvelope[];
}

/**
 * Projection semantic-engine query execution result.
 */
export type ProjectionSemanticExecutionResult =
	| {
			readonly ok: true;
			readonly rows: readonly JsonObject[];
			readonly pagination: ProjectionSemanticPageMeta;
			readonly timeline?: ProjectionSemanticTimelineMeta;
			readonly guards?: ProjectionSemanticGuardMeta;
	  }
	| {
			readonly ok: false;
			readonly error: ProjectionTypedError;
	  };
