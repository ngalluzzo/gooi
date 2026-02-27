import type { KernelHostPortSetInput } from "@gooi/kernel-host-bridge/host-portset";

export interface KernelInvokeInput {
	readonly entrypointId: string;
	readonly kind: "query" | "mutation";
	readonly payload: Readonly<Record<string, unknown>>;
	readonly principal: unknown;
	readonly hostPorts: KernelHostPortSetInput;
	readonly invocationId?: string;
	readonly traceId?: string;
	readonly nowIso?: string;
}

export interface KernelInvokeError {
	readonly code: string;
	readonly message: string;
	readonly details?: Readonly<Record<string, unknown>>;
}

export type KernelInvokeResult =
	| {
			readonly ok: true;
			readonly output: unknown;
	  }
	| {
			readonly ok: false;
			readonly error: KernelInvokeError;
	  };
