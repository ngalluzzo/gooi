import type { AppRuntime } from "@gooi/app-runtime-facade-contracts/create";
import type { CompiledEntrypointBundle } from "@gooi/app-spec-contracts/compiled";
import {
	type PrincipalContext,
	principalContracts,
} from "@gooi/host-contracts/principal";
import type {
	DispatchError,
	DispatchInvocationHost,
	DispatchTraceEnvelope,
} from "@gooi/surface-contracts/dispatch";
import type { ResultEnvelope } from "@gooi/surface-contracts/envelope";
import { dispatchAndBindSurfaceIngress } from "@gooi/surface-runtime";

type EntrypointKind = "query" | "mutation";

export type SurfaceAdapterBundle = Pick<
	CompiledEntrypointBundle,
	"dispatchPlans" | "entrypoints" | "bindings"
>;

const anonymousPrincipal: PrincipalContext = {
	subject: null,
	claims: {},
	tags: ["anonymous"],
};

export type SurfaceAdapterInvokeResult =
	| {
			readonly ok: true;
			readonly surfaceId: string;
			readonly invocationHost: DispatchInvocationHost;
			readonly entrypointKind: EntrypointKind;
			readonly entrypointId: string;
			readonly boundInput: Readonly<Record<string, unknown>>;
			readonly principal: PrincipalContext;
			readonly result: ResultEnvelope<unknown, unknown>;
			readonly trace: DispatchTraceEnvelope;
	  }
	| {
			readonly ok: false;
			readonly stage: "dispatch" | "invoke";
			readonly error:
				| DispatchError
				| {
						readonly code: "surface_entrypoint_kind_unsupported";
						readonly message: string;
						readonly details: Readonly<Record<string, unknown>>;
				  };
			readonly trace: DispatchTraceEnvelope;
	  };

const asRuntimeEntrypointKind = (value: string): EntrypointKind | undefined => {
	if (value === "query" || value === "mutation") {
		return value;
	}
	return undefined;
};

/**
 * Dispatches ingress through surface-runtime and invokes the resolved entrypoint
 * through the provided app runtime.
 */
export const invokeSurfaceIngress = async (input: {
	readonly surfaceId: string;
	readonly ingress: unknown;
	readonly runtime: AppRuntime;
	readonly bundle: SurfaceAdapterBundle;
	readonly surfaceType?: string;
}): Promise<SurfaceAdapterInvokeResult> => {
	const dispatched = dispatchAndBindSurfaceIngress({
		surfaceId: input.surfaceId,
		...(input.surfaceType === undefined
			? {}
			: { surfaceType: input.surfaceType }),
		ingress: input.ingress,
		dispatchPlans: input.bundle.dispatchPlans,
		entrypoints: input.bundle.entrypoints,
		bindings: input.bundle.bindings,
	});

	if (!dispatched.ok) {
		return {
			ok: false,
			stage: "dispatch",
			error: dispatched.error,
			trace: dispatched.trace,
		};
	}

	const entrypointKind = asRuntimeEntrypointKind(
		dispatched.dispatch.entrypointKind,
	);
	if (entrypointKind === undefined) {
		return {
			ok: false,
			stage: "invoke",
			error: {
				code: "surface_entrypoint_kind_unsupported",
				message:
					"Surface adapter supports query/mutation runtime invocation only.",
				details: {
					entrypointKind: dispatched.dispatch.entrypointKind,
					entrypointId: dispatched.dispatch.entrypointId,
				},
			},
			trace: dispatched.trace,
		};
	}

	const principal = principalContracts.principalContextSchema.parse(
		dispatched.principal ?? anonymousPrincipal,
	);

	const result = await input.runtime.invoke({
		surfaceId: dispatched.surfaceId,
		entrypointKind,
		entrypointId: dispatched.dispatch.entrypointId,
		payload: dispatched.boundInput,
		principal,
	});

	return {
		ok: true,
		surfaceId: dispatched.surfaceId,
		invocationHost: dispatched.invocationHost,
		entrypointKind,
		entrypointId: dispatched.dispatch.entrypointId,
		boundInput: dispatched.boundInput,
		principal,
		result,
		trace: dispatched.trace,
	};
};
