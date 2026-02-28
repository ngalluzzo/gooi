import type {
	CompiledEntrypoint,
	CompiledSurfaceBinding,
} from "@gooi/app-spec-contracts/compiled";
import type {
	DispatchError,
	DispatchRequest,
} from "@gooi/surface-contracts/dispatch";
import type { SurfaceRequestPayload } from "@gooi/surface-contracts/request";
import { parseSurfaceRequestPayload } from "@gooi/surface-contracts/request";
import { bindSurfaceInput } from "../binding/bind-surface-input";
import { readSourceValue } from "../binding/source-path";
import {
	type DispatchSurfaceRequestInput,
	dispatchSurfaceRequest,
	type SurfaceDispatchSelection,
} from "./dispatch-surface-request";

const toBindingKey = (input: {
	readonly surfaceId: string;
	readonly kind: "query" | "mutation";
	readonly entrypointId: string;
}): string => `${input.surfaceId}:${input.kind}:${input.entrypointId}`;

const transportError = (input: {
	readonly message: string;
	readonly details?: Readonly<Record<string, unknown>>;
}): DispatchError => ({
	code: "dispatch_transport_error",
	message: input.message,
	...(input.details === undefined ? {} : { details: input.details }),
});

const parsePayloadBuckets = (
	request: DispatchRequest,
): SurfaceRequestPayload => {
	const payloadCandidate = request.payload ?? {};
	return parseSurfaceRequestPayload(payloadCandidate);
};

const bindRoutePayload = (input: {
	readonly requestPayload: SurfaceRequestPayload;
	readonly selection: SurfaceDispatchSelection;
}): Readonly<Record<string, unknown>> => {
	const output: Record<string, unknown> = {};
	for (const [fieldName, sourcePath] of Object.entries(
		input.selection.fieldBindings,
	)) {
		const resolved = readSourceValue(input.requestPayload, sourcePath);
		if (resolved !== undefined) {
			output[fieldName] = resolved;
		}
	}
	return output;
};

export interface DispatchAndBindSurfaceInput
	extends DispatchSurfaceRequestInput {
	readonly entrypoints: Readonly<Record<string, CompiledEntrypoint>>;
	readonly bindings: Readonly<Record<string, CompiledSurfaceBinding>>;
}

export type DispatchAndBindSurfaceResult =
	| {
			readonly ok: true;
			readonly dispatch: SurfaceDispatchSelection;
			readonly boundInput: Readonly<Record<string, unknown>>;
			readonly trace: import("@gooi/surface-contracts/dispatch").DispatchTraceEnvelope;
			readonly entrypoint?: CompiledEntrypoint;
			readonly binding?: CompiledSurfaceBinding;
	  }
	| {
			readonly ok: false;
			readonly error: DispatchError;
			readonly trace: import("@gooi/surface-contracts/dispatch").DispatchTraceEnvelope;
	  };

/**
 * Dispatches and binds one request to a canonical entrypoint payload.
 */
export const dispatchAndBindSurfaceInput = (
	input: DispatchAndBindSurfaceInput,
): DispatchAndBindSurfaceResult => {
	const dispatch = dispatchSurfaceRequest(input);
	if (!dispatch.ok) {
		return dispatch;
	}

	const requestPayload = (() => {
		try {
			return parsePayloadBuckets(input.request);
		} catch {
			return null;
		}
	})();
	if (requestPayload === null) {
		return {
			ok: false,
			error: transportError({
				message: "Dispatch payload failed surface request payload validation.",
				details: {
					surfaceId: input.request.surfaceId,
					handlerId: dispatch.selection.handlerId,
				},
			}),
			trace: dispatch.trace,
		};
	}

	if (dispatch.selection.entrypointKind === "route") {
		return {
			ok: true,
			dispatch: dispatch.selection,
			boundInput: bindRoutePayload({
				requestPayload,
				selection: dispatch.selection,
			}),
			trace: dispatch.trace,
		};
	}

	const entrypointKey = `${dispatch.selection.entrypointKind}:${dispatch.selection.entrypointId}`;
	const entrypoint = input.entrypoints[entrypointKey];
	if (entrypoint === undefined) {
		return {
			ok: false,
			error: transportError({
				message:
					"Dispatch target entrypoint contract is missing from compiled map.",
				details: {
					entrypointKind: dispatch.selection.entrypointKind,
					entrypointId: dispatch.selection.entrypointId,
					handlerId: dispatch.selection.handlerId,
				},
			}),
			trace: dispatch.trace,
		};
	}

	const bindingKey = toBindingKey({
		surfaceId: dispatch.selection.surfaceId,
		kind: dispatch.selection.entrypointKind,
		entrypointId: dispatch.selection.entrypointId,
	});
	const binding = input.bindings[bindingKey];
	if (binding === undefined) {
		return {
			ok: false,
			error: transportError({
				message:
					"Dispatch target binding contract is missing from compiled map.",
				details: {
					bindingKey,
					handlerId: dispatch.selection.handlerId,
				},
			}),
			trace: dispatch.trace,
		};
	}

	const bound = bindSurfaceInput({
		request: requestPayload,
		entrypoint,
		binding,
	});
	if (!bound.ok) {
		return {
			ok: false,
			error: transportError({
				message: bound.error.message,
				details: {
					...(bound.error.details === undefined
						? {}
						: { bindingDetails: bound.error.details }),
					handlerId: dispatch.selection.handlerId,
					bindingKey,
				},
			}),
			trace: dispatch.trace,
		};
	}

	return {
		ok: true,
		dispatch: dispatch.selection,
		boundInput: bound.value,
		trace: dispatch.trace,
		entrypoint,
		binding,
	};
};
