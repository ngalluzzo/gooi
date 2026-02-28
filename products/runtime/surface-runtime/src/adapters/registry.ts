import type { DispatchError } from "@gooi/surface-contracts/dispatch";
import type { SurfaceRequestPayload } from "@gooi/surface-contracts/request";
import { cliSurfaceAdapter } from "./cli-adapter";
import { httpSurfaceAdapter } from "./http-adapter";
import { webSurfaceAdapter } from "./web-adapter";
import { webhookSurfaceAdapter } from "./webhook-adapter";

export interface SurfaceAdapterNormalizedIngress {
	readonly surfaceType: string;
	readonly attributes: Readonly<Record<string, unknown>>;
	readonly payload?: SurfaceRequestPayload;
}

export type SurfaceAdapterNormalizeResult =
	| {
			readonly ok: true;
			readonly value: SurfaceAdapterNormalizedIngress;
	  }
	| {
			readonly ok: false;
			readonly error: DispatchError;
	  };

export interface SurfaceAdapter<TIngress = unknown> {
	readonly surfaceType: string;
	normalize(ingress: TIngress): SurfaceAdapterNormalizeResult;
}

export interface SurfaceAdapterRegistry {
	get(surfaceType: string): SurfaceAdapter | undefined;
}

export const defaultSurfaceAdapters: readonly SurfaceAdapter[] = [
	httpSurfaceAdapter,
	webSurfaceAdapter,
	cliSurfaceAdapter,
	webhookSurfaceAdapter,
];

export const createSurfaceAdapterRegistry = (
	adapters: readonly SurfaceAdapter[] = defaultSurfaceAdapters,
): SurfaceAdapterRegistry => {
	const lookup: Record<string, SurfaceAdapter> = {};
	for (const adapter of adapters) {
		lookup[adapter.surfaceType] = adapter;
	}
	return {
		get: (surfaceType) => lookup[surfaceType],
	};
};

export const defaultSurfaceAdapterRegistry = createSurfaceAdapterRegistry();
