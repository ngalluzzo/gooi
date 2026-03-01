import type { AppRuntime } from "@gooi/app-runtime-facade-contracts/create";
import type { SurfaceAdapterBundle } from "../shared/invoke-surface-ingress";
import {
	invokeSurfaceIngress,
	type SurfaceAdapterInvokeResult,
} from "../shared/invoke-surface-ingress";

/**
 * Executes one web ingress payload through surface dispatch/binding and runtime invocation.
 */
export const runWebSurface = async (input: {
	readonly runtime: AppRuntime;
	readonly bundle: SurfaceAdapterBundle;
	readonly ingress: unknown;
	readonly surfaceId?: string;
}): Promise<SurfaceAdapterInvokeResult> =>
	invokeSurfaceIngress({
		surfaceId: input.surfaceId ?? "web",
		ingress: input.ingress,
		runtime: input.runtime,
		bundle: input.bundle,
		surfaceType: "web",
	});

/**
 * Creates a reusable web adapter executor with fixed runtime/bundle context.
 */
export const createWebSurfaceAdapter = (input: {
	readonly runtime: AppRuntime;
	readonly bundle: SurfaceAdapterBundle;
	readonly surfaceId?: string;
}) => {
	return (ingress: unknown): Promise<SurfaceAdapterInvokeResult> =>
		runWebSurface({
			runtime: input.runtime,
			bundle: input.bundle,
			...(input.surfaceId === undefined ? {} : { surfaceId: input.surfaceId }),
			ingress,
		});
};
