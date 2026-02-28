import type {
	CompiledEntrypoint,
	CompiledSurfaceBinding,
} from "@gooi/app-spec-contracts/compiled";
import type {
	DispatchError,
	DispatchRequest,
} from "@gooi/surface-contracts/dispatch";
import { resolveDispatchBindingPipeline } from "./binding-pipeline";
import { pickDispatchAuthContext } from "./context-pass-through";
import {
	type DispatchSurfaceRequestInput,
	dispatchSurfaceRequest,
	type SurfaceDispatchSelection,
} from "./dispatch-surface-request";

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
			readonly principal?: DispatchRequest["principal"];
			readonly authContext?: DispatchRequest["authContext"];
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

	const bound = resolveDispatchBindingPipeline({
		request: dispatch.request,
		selection: dispatch.selection,
		entrypoints: input.entrypoints,
		bindings: input.bindings,
	});
	if (!bound.ok) {
		return {
			ok: false,
			error: bound.error,
			trace: dispatch.trace,
		};
	}

	return {
		ok: true,
		dispatch: dispatch.selection,
		boundInput: bound.boundInput,
		trace: dispatch.trace,
		...(bound.entrypoint === undefined ? {} : { entrypoint: bound.entrypoint }),
		...(bound.binding === undefined ? {} : { binding: bound.binding }),
		...pickDispatchAuthContext(dispatch.request),
	};
};
