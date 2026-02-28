import type { JsonValue } from "@gooi/contract-primitives/json";
import type { DispatchEntrypointKind } from "@gooi/surface-contracts/dispatch";

/**
 * Stable dispatch target kind for render-originated intents.
 */
export type RenderEntrypointKind = DispatchEntrypointKind;

/**
 * Canonical node property plan contract.
 */
export interface CompiledNodePropPlan {
	readonly value: JsonValue;
}

/**
 * Canonical interaction intent plan produced by a render node.
 */
export interface CompiledInteractionIntentPlan {
	readonly entrypointKind: RenderEntrypointKind;
	readonly entrypointId: string;
	readonly input: Readonly<Record<string, JsonValue>>;
}

/**
 * Canonical render node contract.
 */
export interface CompiledViewRenderNode {
	readonly id: string;
	readonly type: string;
	readonly propPlans: Readonly<Record<string, CompiledNodePropPlan>>;
	readonly children: readonly string[];
	readonly interactions: Readonly<
		Record<string, CompiledInteractionIntentPlan>
	>;
}
