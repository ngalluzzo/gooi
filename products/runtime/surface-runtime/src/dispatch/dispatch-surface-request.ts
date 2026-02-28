import type {
	CompiledSurfaceDispatchPlanSet,
	DispatchError,
	DispatchRequest,
	DispatchTraceEnvelope,
} from "@gooi/surface-contracts/dispatch";
import { runDispatchMatchEngine } from "./match-engine";
import { parseDispatchRequestGate } from "./request-gate";
import { resolveDispatchSelection } from "./selection";

export interface SurfaceDispatchSelection {
	readonly handlerId: string;
	readonly surfaceId: string;
	readonly entrypointKind: "query" | "mutation" | "route";
	readonly entrypointId: string;
	readonly fieldBindings: Readonly<Record<string, string>>;
}

export type DispatchSurfaceRequestResult =
	| {
			readonly ok: true;
			readonly surfaceId: string;
			readonly invocationHost: DispatchRequest["invocationHost"];
			readonly request: DispatchRequest;
			readonly selection: SurfaceDispatchSelection;
			readonly trace: DispatchTraceEnvelope;
	  }
	| {
			readonly ok: false;
			readonly error: DispatchError;
			readonly trace: DispatchTraceEnvelope;
	  };

export interface DispatchSurfaceRequestInput {
	readonly dispatchPlans: CompiledSurfaceDispatchPlanSet;
	readonly request: DispatchRequest;
}

/**
 * Resolves one dispatch request to one canonical handler target with deterministic precedence.
 */
export const dispatchSurfaceRequest = (
	input: DispatchSurfaceRequestInput,
): DispatchSurfaceRequestResult => {
	const gate = parseDispatchRequestGate(input.request);
	if (!gate.ok) {
		return gate;
	}

	const handlers =
		input.dispatchPlans.plans[gate.request.surfaceId]?.handlers ?? [];
	const matches = runDispatchMatchEngine({
		request: gate.request,
		handlers,
	});
	const selection = resolveDispatchSelection({
		request: gate.request,
		candidates: matches.candidates,
		matched: matches.matched,
		steps: matches.steps,
	});
	if (!selection.ok) {
		return selection;
	}

	return {
		ok: true,
		surfaceId: gate.request.surfaceId,
		invocationHost: gate.request.invocationHost,
		request: gate.request,
		selection: {
			handlerId: selection.winner.handlerId,
			surfaceId: selection.winner.surfaceId,
			entrypointKind: selection.winner.target.entrypointKind,
			entrypointId: selection.winner.target.entrypointId,
			fieldBindings: selection.winner.target.fieldBindings,
		},
		trace: selection.trace,
	};
};
