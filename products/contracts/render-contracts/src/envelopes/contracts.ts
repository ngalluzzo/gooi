import type { JsonObject, JsonValue } from "@gooi/contract-primitives/json";
import type { CompiledInteractionIntentPlan } from "../nodes/contracts";

/**
 * Render evaluation envelope version.
 */
export const renderEvaluationEnvelopeVersion = "1.0.0" as const;

/**
 * Render dispatch intent envelope version.
 */
export const interactionIntentEnvelopeVersion = "1.0.0" as const;

/**
 * Render diagnostic envelope version.
 */
export const renderDiagnosticEnvelopeVersion = "1.0.0" as const;

/**
 * Canonical render tree node in evaluation output.
 */
export interface EvaluatedRenderNode {
	readonly nodeId: string;
	readonly nodeType: string;
	readonly props: Readonly<Record<string, JsonValue>>;
	readonly children: readonly EvaluatedRenderNode[];
	readonly interactionIds: readonly string[];
}

/**
 * Render evaluation envelope from runtime render kernel.
 */
export interface RenderEvaluationEnvelope {
	readonly envelopeVersion: typeof renderEvaluationEnvelopeVersion;
	readonly ok: boolean;
	readonly screenId: string;
	readonly tree?: EvaluatedRenderNode;
	readonly diagnostics?: readonly string[];
}

/**
 * Interaction dispatch envelope produced by render kernel.
 */
export interface InteractionIntentEnvelope {
	readonly envelopeVersion: typeof interactionIntentEnvelopeVersion;
	readonly screenId: string;
	readonly nodeId: string;
	readonly intent?: CompiledInteractionIntentPlan;
	readonly error?: string;
}

/**
 * Render diagnostic envelope for kernel-adapter handoff.
 */
export interface RenderDiagnosticEnvelope {
	readonly envelopeVersion: typeof renderDiagnosticEnvelopeVersion;
	readonly code: string;
	readonly message: string;
	readonly path?: string;
	readonly details?: JsonObject;
}
