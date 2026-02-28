import type {
	DispatchRequest,
	DispatchTraceEnvelope,
} from "@gooi/surface-contracts/dispatch";
import { parseDispatchRequest } from "@gooi/surface-contracts/dispatch";
import { buildDispatchError, dispatchTransportError } from "./trace-error";

const resolveTraceSurfaceId = (value: unknown): string => {
	if (typeof value !== "string") {
		return "unknown_surface";
	}
	const normalized = value.trim();
	return normalized.length === 0 ? "unknown_surface" : normalized;
};

export type ParseDispatchRequestGateResult =
	| {
			readonly ok: true;
			readonly request: DispatchRequest;
	  }
	| {
			readonly ok: false;
			readonly error: import("@gooi/surface-contracts/dispatch").DispatchError;
			readonly trace: DispatchTraceEnvelope;
	  };

export const parseDispatchRequestGate = (
	request: DispatchRequest,
): ParseDispatchRequestGateResult => {
	try {
		return {
			ok: true,
			request: parseDispatchRequest(request),
		};
	} catch {
		const surfaceId = resolveTraceSurfaceId(
			(request as { surfaceId?: unknown }).surfaceId,
		);
		return buildDispatchError(
			dispatchTransportError({
				message: "Dispatch request failed contract validation.",
				details: {
					surfaceId,
				},
			}),
			{
				surfaceId,
				candidates: [],
				steps: [
					{
						handlerId: "request",
						decision: "candidate_rejected",
						reason: "Dispatch request failed contract validation.",
					},
				],
			},
		);
	}
};
