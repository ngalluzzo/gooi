import type { ProjectionTypedError } from "../errors/projection-errors";
import type { ProjectionStrategy } from "../plans/projection-plan";

/**
 * Envelope version for projection runtime query results.
 */
export const projectionResultEnvelopeVersion = "1.0.0" as const;

/**
 * Canonical page metadata emitted by projection strategies.
 */
export interface ProjectionPageMeta {
	readonly mode: "page";
	readonly page: number;
	readonly pageSize: number;
	readonly totalRows: number;
	readonly totalPages: number;
}

/**
 * Canonical timeline metadata emitted by timeline strategy.
 */
export interface ProjectionTimelineMeta {
	readonly rebuildStatus: "in_progress" | "complete" | "failed" | "stale";
	readonly rebuildProgress: number | null;
	readonly rebuildStartedAt: string | null;
	readonly historyComplete: boolean;
	readonly asOfApplied: string | null;
}

/**
 * Canonical projection metadata shared by all strategy results.
 */
export interface ProjectionResultMeta {
	readonly projectionId: string;
	readonly strategy: ProjectionStrategy;
	readonly artifactHash: string;
	readonly pagination: ProjectionPageMeta;
	readonly timeline?: ProjectionTimelineMeta;
}

/**
 * Typed projection result envelope.
 */
export interface ProjectionResultEnvelope {
	readonly envelopeVersion: typeof projectionResultEnvelopeVersion;
	readonly ok: boolean;
	readonly rows?: readonly Readonly<Record<string, unknown>>[];
	readonly meta?: ProjectionResultMeta;
	readonly error?: ProjectionTypedError;
}
