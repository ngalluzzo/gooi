import type {
	DispatchError,
	DispatchTraceEnvelope,
} from "@gooi/surface-contracts/dispatch";
import type { SurfaceAdapterRegistry } from "../adapters/registry";
import { defaultSurfaceAdapterRegistry } from "../adapters/registry";
import { adapterTransportError } from "../adapters/transport-error";
import {
	type DispatchAndBindSurfaceInput,
	type DispatchAndBindSurfaceResult,
	dispatchAndBindSurfaceInput,
} from "./dispatch-and-bind";

export interface DispatchAndBindSurfaceIngressInput
	extends Omit<DispatchAndBindSurfaceInput, "request"> {
	readonly surfaceId: string;
	readonly ingress: unknown;
	readonly surfaceType?: string;
	readonly adapterRegistry?: SurfaceAdapterRegistry;
}

const buildTransportFailure = (input: {
	readonly surfaceId: string;
	readonly error: DispatchError;
}): DispatchAndBindSurfaceResult => {
	const trace: DispatchTraceEnvelope = {
		surfaceId: input.surfaceId,
		candidates: [],
		steps: [
			{
				handlerId: "adapter",
				decision: "candidate_rejected",
				reason: input.error.message,
			},
		],
		error: input.error,
	};
	return {
		ok: false,
		error: input.error,
		trace,
	};
};

/**
 * Normalizes native ingress with one registered surface adapter, then dispatches and binds.
 */
export const dispatchAndBindSurfaceIngress = (
	input: DispatchAndBindSurfaceIngressInput,
): DispatchAndBindSurfaceResult => {
	const resolvedSurfaceType = input.surfaceType ?? input.surfaceId;
	const adapterRegistry =
		input.adapterRegistry ?? defaultSurfaceAdapterRegistry;
	const adapter = adapterRegistry.get(resolvedSurfaceType);
	if (adapter === undefined) {
		return buildTransportFailure({
			surfaceId: input.surfaceId,
			error: adapterTransportError({
				message: "No surface adapter is registered for the requested surface.",
				details: {
					surfaceId: input.surfaceId,
					surfaceType: resolvedSurfaceType,
				},
			}),
		});
	}

	const normalized = adapter.normalize(input.ingress);
	if (!normalized.ok) {
		return buildTransportFailure({
			surfaceId: input.surfaceId,
			error: normalized.error,
		});
	}

	return dispatchAndBindSurfaceInput({
		dispatchPlans: input.dispatchPlans,
		entrypoints: input.entrypoints,
		bindings: input.bindings,
		request: {
			surfaceId: input.surfaceId,
			surfaceType: normalized.value.surfaceType,
			attributes: normalized.value.attributes,
			...(normalized.value.payload === undefined
				? {}
				: { payload: normalized.value.payload }),
			...(normalized.value.principal === undefined
				? {}
				: { principal: normalized.value.principal }),
			...(normalized.value.authContext === undefined
				? {}
				: { authContext: normalized.value.authContext }),
		},
	});
};
