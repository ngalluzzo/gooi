import {
	type BindSurfaceInputInput,
	bindSurfaceInput as bindSurfaceInputImpl,
} from "./binding/bind-surface-input";
import {
	type DispatchAndBindSurfaceInput,
	type DispatchAndBindSurfaceResult,
	dispatchAndBindSurfaceInput as dispatchAndBindSurfaceInputImpl,
} from "./dispatch/dispatch-and-bind";
import {
	type DispatchSurfaceRequestInput,
	type DispatchSurfaceRequestResult,
	dispatchSurfaceRequest as dispatchSurfaceRequestImpl,
	type SurfaceDispatchSelection,
} from "./dispatch/dispatch-surface-request";

export type {
	BindSurfaceInputInput,
	DispatchAndBindSurfaceInput,
	DispatchAndBindSurfaceResult,
	DispatchSurfaceRequestInput,
	DispatchSurfaceRequestResult,
	SurfaceDispatchSelection,
};

/**
 * Binds a surface payload into deterministic entrypoint input values.
 */
export const bindSurfaceInput = (input: BindSurfaceInputInput) =>
	bindSurfaceInputImpl(input);

/**
 * Resolves one dispatch request to a deterministic surface handler target.
 */
export const dispatchSurfaceRequest = (input: DispatchSurfaceRequestInput) =>
	dispatchSurfaceRequestImpl(input);

/**
 * Resolves dispatch and binds request buckets into canonical entrypoint payload.
 */
export const dispatchAndBindSurfaceInput = (
	input: DispatchAndBindSurfaceInput,
): DispatchAndBindSurfaceResult => dispatchAndBindSurfaceInputImpl(input);
