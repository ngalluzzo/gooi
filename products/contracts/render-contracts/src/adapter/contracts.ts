import type { RenderDiagnosticEnvelope } from "../envelopes/contracts";
import type { RenderEntrypointKind } from "../nodes/contracts";

/**
 * Declared renderer adapter capability profile.
 */
export interface RendererAdapterCapabilityProfile {
	readonly adapterId: string;
	readonly adapterVersion: string;
	readonly supportedNodeTypes: readonly string[];
	readonly supportedEntrypointKinds: readonly RenderEntrypointKind[];
	readonly supportedInteractionsByNodeType?: Readonly<
		Record<string, readonly string[]>
	>;
}

/**
 * Typed capability mismatch reason for render adapter conformance.
 */
export type RenderAdapterCapabilityMismatchReason =
	| "unsupported_node_type"
	| "unsupported_interaction"
	| "unsupported_entrypoint_kind";

/**
 * Structured details payload for one adapter capability mismatch.
 */
export interface RenderAdapterCapabilityMismatchDetails {
	readonly adapterId: string;
	readonly reason: RenderAdapterCapabilityMismatchReason;
	readonly nodeId: string;
	readonly nodeType: string;
	readonly interactionId?: string;
	readonly entrypointKind?: RenderEntrypointKind;
}

/**
 * Typed render adapter compatibility diagnostic.
 */
export interface RenderAdapterCompatibilityDiagnostic
	extends Omit<RenderDiagnosticEnvelope, "code" | "details"> {
	readonly code: "render_adapter_capability_error";
	readonly details?: RenderAdapterCapabilityMismatchDetails;
}

/**
 * Typed render adapter compatibility evaluation result.
 */
export interface RenderAdapterCompatibilityResult {
	readonly ok: boolean;
	readonly diagnostics: readonly RenderAdapterCompatibilityDiagnostic[];
}
