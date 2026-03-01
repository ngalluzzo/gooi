import type { JsonValue } from "@gooi/contract-primitives/json";
import type {
	CompiledInteractionIntentPlan,
	CompiledViewRenderNode,
} from "../nodes/contracts";

/**
 * Render IR contract version.
 */
export const compiledViewRenderIRVersion = "1.0.0" as const;

/**
 * Render IR version type.
 */
export type CompiledViewRenderIRVersion = typeof compiledViewRenderIRVersion;

/**
 * Screen-level query binding for render data slots.
 */
export interface CompiledScreenDataBinding {
	readonly queryId: string;
	readonly refreshOnSignals: readonly string[];
	readonly args?: Readonly<Record<string, JsonValue>>;
}

/**
 * Canonical per-screen render IR shape.
 */
export interface CompiledViewScreen {
	readonly id: string;
	readonly data: Readonly<Record<string, CompiledScreenDataBinding>>;
	readonly rootNodeIds: readonly string[];
}

/**
 * Intent plan scoped to a node for static dispatch wiring.
 */
export interface CompiledNodeIntentPlan {
	readonly nodeId: string;
	readonly interactionPlans: Readonly<
		Record<string, CompiledInteractionIntentPlan>
	>;
}

/**
 * Canonical compiled render IR consumed by render kernels.
 */
export interface CompiledViewRenderIR {
	readonly artifactVersion: CompiledViewRenderIRVersion;
	readonly screens: Readonly<Record<string, CompiledViewScreen>>;
	readonly nodes: Readonly<Record<string, CompiledViewRenderNode>>;
	readonly screenOrder: readonly string[];
	readonly nodeOrder: readonly string[];
	readonly nodeIntentPlans: Readonly<Record<string, CompiledNodeIntentPlan>>;
}
