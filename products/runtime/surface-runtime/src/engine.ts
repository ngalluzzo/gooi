import type {
	SurfaceAdapter,
	SurfaceAdapterNormalizedIngress,
	SurfaceAdapterNormalizeResult,
	SurfaceAdapterRegistry,
} from "./adapters/registry";
import {
	createSurfaceAdapterRegistry,
	defaultSurfaceAdapters,
} from "./adapters/registry";
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
	type DispatchAndBindSurfaceIngressInput,
	dispatchAndBindSurfaceIngress as dispatchAndBindSurfaceIngressImpl,
} from "./dispatch/dispatch-from-ingress";
import {
	type DispatchSurfaceRequestInput,
	type DispatchSurfaceRequestResult,
	dispatchSurfaceRequest as dispatchSurfaceRequestImpl,
	type SurfaceDispatchSelection,
} from "./dispatch/dispatch-surface-request";
import {
	type ValidateRendererAdapterCompatibilityInput,
	validateRendererAdapterCompatibility as validateRendererAdapterCompatibilityImpl,
} from "./render/adapter-compatibility";

export type {
	BindSurfaceInputInput,
	DispatchAndBindSurfaceIngressInput,
	DispatchAndBindSurfaceInput,
	DispatchAndBindSurfaceResult,
	DispatchSurfaceRequestInput,
	DispatchSurfaceRequestResult,
	SurfaceAdapter,
	SurfaceAdapterNormalizeResult,
	SurfaceAdapterNormalizedIngress,
	SurfaceAdapterRegistry,
	SurfaceDispatchSelection,
	ValidateRendererAdapterCompatibilityInput,
};

export { createSurfaceAdapterRegistry, defaultSurfaceAdapters };

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

/**
 * Normalizes one native ingress payload and resolves canonical dispatch + bound input.
 */
export const dispatchAndBindSurfaceIngress = (
	input: DispatchAndBindSurfaceIngressInput,
): DispatchAndBindSurfaceResult => dispatchAndBindSurfaceIngressImpl(input);

/**
 * Validates render IR against one renderer adapter capability declaration.
 */
export const validateRendererAdapterCompatibility = (
	input: ValidateRendererAdapterCompatibilityInput,
) => validateRendererAdapterCompatibilityImpl(input);
