import type {
	CompiledDispatchHandler,
	DispatchRequest,
	DispatchTraceEnvelope,
	DispatchTraceStep,
} from "@gooi/surface-contracts/dispatch";
import { buildDispatchError } from "./trace-error";

export type ResolveDispatchSelectionResult =
	| {
			readonly ok: true;
			readonly winner: CompiledDispatchHandler;
			readonly trace: Omit<DispatchTraceEnvelope, "error">;
	  }
	| {
			readonly ok: false;
			readonly error: import("@gooi/surface-contracts/dispatch").DispatchError;
			readonly trace: DispatchTraceEnvelope;
	  };

export const resolveDispatchSelection = (input: {
	readonly request: DispatchRequest;
	readonly candidates: CompiledDispatchHandler[];
	readonly matched: CompiledDispatchHandler[];
	readonly steps: DispatchTraceStep[];
}): ResolveDispatchSelectionResult => {
	const traceBase: Omit<DispatchTraceEnvelope, "error"> = {
		surfaceId: input.request.surfaceId,
		candidates: input.candidates,
		steps: input.steps,
	};
	if (input.matched.length === 0) {
		input.steps.push({
			handlerId: "none",
			decision: "no_match",
			reason: "No candidates matched the request.",
		});
		return buildDispatchError(
			{
				code: "dispatch_not_found_error",
				message: "No dispatch handler matched the request.",
				details: {
					surfaceId: input.request.surfaceId,
					surfaceType: input.request.surfaceType,
					candidateCount: input.candidates.length,
				},
			},
			traceBase,
		);
	}

	const topSpecificity = input.matched[0]?.specificity ?? 0;
	const topMatches = input.matched.filter(
		(handler) => handler.specificity === topSpecificity,
	);
	if (topMatches.length > 1) {
		input.steps.push(
			...topMatches.map((handler) => ({
				handlerId: handler.handlerId,
				decision: "ambiguous_top_match" as const,
				reason: "Multiple top-ranked handlers matched with equal specificity.",
			})),
		);
		return buildDispatchError(
			{
				code: "dispatch_ambiguous_error",
				message: "Dispatch request matched multiple top-ranked handlers.",
				details: {
					surfaceId: input.request.surfaceId,
					surfaceType: input.request.surfaceType,
					handlerIds: topMatches.map((handler) => handler.handlerId),
					specificity: topSpecificity,
				},
			},
			traceBase,
		);
	}

	const winner = topMatches[0];
	if (winner === undefined) {
		return buildDispatchError(
			{
				code: "dispatch_transport_error",
				message: "Dispatch winner resolution failed unexpectedly.",
			},
			traceBase,
		);
	}
	input.steps.push({
		handlerId: winner.handlerId,
		decision: "winner_selected",
		reason: "Highest specificity matched candidate selected deterministically.",
	});
	return {
		ok: true,
		winner,
		trace: {
			...traceBase,
			selectedHandlerId: winner.handlerId,
		},
	};
};
