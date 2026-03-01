import type { AppRuntime } from "@gooi/app-runtime-facade-contracts/create";
import type { SurfaceAdapterBundle } from "../shared/invoke-surface-ingress";
import {
	invokeSurfaceIngress,
	type SurfaceAdapterInvokeResult,
} from "../shared/invoke-surface-ingress";

/**
 * Executes one CLI ingress payload through surface dispatch/binding and runtime invocation.
 */
export const runCliSurface = async (input: {
	readonly runtime: AppRuntime;
	readonly bundle: SurfaceAdapterBundle;
	readonly ingress: unknown;
	readonly surfaceId?: string;
}): Promise<SurfaceAdapterInvokeResult> =>
	invokeSurfaceIngress({
		surfaceId: input.surfaceId ?? "cli",
		ingress: input.ingress,
		runtime: input.runtime,
		bundle: input.bundle,
		surfaceType: "cli",
	});

/**
 * Creates a reusable CLI adapter executor with fixed runtime/bundle context.
 */
export const createCliSurfaceAdapter = (input: {
	readonly runtime: AppRuntime;
	readonly bundle: SurfaceAdapterBundle;
	readonly surfaceId?: string;
}) => {
	return (ingress: unknown): Promise<SurfaceAdapterInvokeResult> =>
		runCliSurface({
			runtime: input.runtime,
			bundle: input.bundle,
			...(input.surfaceId === undefined ? {} : { surfaceId: input.surfaceId }),
			ingress,
		});
};
