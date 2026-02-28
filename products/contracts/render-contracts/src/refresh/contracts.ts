import type { RefreshTrigger } from "@gooi/surface-contracts/envelope";
import type { RenderDiagnosticEnvelope } from "../envelopes/contracts";

/**
 * Render refresh lifecycle artifact version.
 */
export const renderRefreshPlanVersion = "1.0.0" as const;

/**
 * Render refresh lifecycle artifact version type.
 */
export type RenderRefreshPlanVersion = typeof renderRefreshPlanVersion;

/**
 * One deterministic refresh artifact for a screen data slot.
 */
export interface RenderRefreshSlotArtifact {
	readonly screenId: string;
	readonly slotId: string;
	readonly queryId: string;
	readonly matchedSignalIds: readonly string[];
}

/**
 * One deterministic refresh artifact for a screen.
 */
export interface RenderRefreshScreenArtifact {
	readonly screenId: string;
	readonly slotIds: readonly string[];
	readonly queryIds: readonly string[];
}

/**
 * Canonical render refresh plan derived from runtime invalidation metadata.
 */
export interface RenderRefreshPlan {
	readonly artifactVersion: RenderRefreshPlanVersion;
	readonly refreshTriggers: readonly RefreshTrigger[];
	readonly runtimeAffectedQueryIds: readonly string[];
	readonly derivedAffectedQueryIds: readonly string[];
	readonly slotRefreshes: readonly RenderRefreshSlotArtifact[];
	readonly screenRefreshes: readonly RenderRefreshScreenArtifact[];
}

/**
 * Structured details payload for refresh/runtime consistency diagnostics.
 */
export interface RenderRefreshConsistencyDiagnosticDetails {
	readonly runtimeAffectedQueryIds: readonly string[];
	readonly derivedAffectedQueryIds: readonly string[];
	readonly missingInRuntime: readonly string[];
	readonly missingInDerived: readonly string[];
}

/**
 * Typed render refresh consistency diagnostic.
 */
export interface RenderRefreshConsistencyDiagnostic
	extends Omit<RenderDiagnosticEnvelope, "code" | "details"> {
	readonly code: "render_refresh_consistency_error";
	readonly details?: RenderRefreshConsistencyDiagnosticDetails;
}

/**
 * Render refresh lifecycle result.
 */
export interface RenderRefreshLifecycleResult {
	readonly ok: boolean;
	readonly plan: RenderRefreshPlan;
	readonly diagnostics: readonly RenderRefreshConsistencyDiagnostic[];
}
