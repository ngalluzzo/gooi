import { runEntrypointThroughKernel } from "@gooi/execution-kernel/entrypoint";
import { dispatchAndBindSurfaceIngress } from "@gooi/surface-runtime";
import { createDefaultConformanceHostPorts } from "../entrypoint-conformance/run-entrypoint-through-kernel";
import type { RunDispatchRenderConformanceInput } from "./contracts";
import {
	buildRenderTree,
	toRenderDiagnostic,
	toRenderEnvelope,
} from "./render-adapter";

const fixedNowIso = "2026-02-27T00:00:00.000Z";

export type DispatchRenderAttempt =
	| {
			readonly ok: true;
			readonly render: import("@gooi/render-contracts/envelopes").RenderEvaluationEnvelope;
	  }
	| {
			readonly ok: false;
			readonly diagnostic: import("@gooi/render-contracts/envelopes").RenderDiagnosticEnvelope;
	  };

export const dispatchRuntimeRender = async (input: {
	readonly suiteInput: RunDispatchRenderConformanceInput;
	readonly ingress: unknown;
	readonly principal: RunDispatchRenderConformanceInput["authorizedPrincipal"];
	readonly traceSeed: string;
}): Promise<DispatchRenderAttempt> => {
	const dispatch = dispatchAndBindSurfaceIngress({
		surfaceId: input.suiteInput.surfaceId,
		ingress: {
			...(input.ingress as Readonly<Record<string, unknown>>),
			principal: input.principal,
			authContext: {
				provider: "dispatch-render-conformance",
			},
		},
		dispatchPlans: input.suiteInput.bundle.dispatchPlans,
		entrypoints: input.suiteInput.bundle.entrypoints,
		bindings: input.suiteInput.bundle.bindings,
	});
	if (!dispatch.ok) {
		return {
			ok: false,
			diagnostic: toRenderDiagnostic({
				code: dispatch.error.code,
				message: dispatch.error.message,
				details: {
					upstreamCode: dispatch.error.code,
				},
			}),
		};
	}

	if (dispatch.binding === undefined) {
		return {
			ok: false,
			diagnostic: toRenderDiagnostic({
				code: "dispatch_transport_error",
				message:
					"Dispatch resolved without an executable query/mutation binding.",
				details: {
					upstreamCode: "dispatch_transport_error",
				},
			}),
		};
	}

	const hostPorts = createDefaultConformanceHostPorts();
	const runtimeResult = await runEntrypointThroughKernel({
		bundle: input.suiteInput.bundle,
		binding: dispatch.binding,
		payload: dispatch.boundInput,
		principal: dispatch.principal ?? input.principal,
		domainRuntime: input.suiteInput.domainRuntime,
		hostPorts: {
			...hostPorts,
			clock: {
				nowIso: () => fixedNowIso,
			},
		},
		traceId: `trace_${input.traceSeed}`,
		invocationId: `invocation_${input.traceSeed}`,
		now: fixedNowIso,
	});
	if (!runtimeResult.ok) {
		return {
			ok: false,
			diagnostic: toRenderDiagnostic({
				code: runtimeResult.error?.code ?? "invocation_error",
				message:
					runtimeResult.error?.message ??
					"Runtime invocation failed before render evaluation.",
				details: {
					upstreamCode: runtimeResult.error?.code ?? "invocation_error",
				},
			}),
		};
	}

	const tree = buildRenderTree({
		suiteInput: input.suiteInput,
		queryOutput: runtimeResult.output,
	});
	if (tree === undefined) {
		return {
			ok: false,
			diagnostic: toRenderDiagnostic({
				code: "render_screen_not_found_error",
				message: "Configured screen is missing from compiled render IR.",
			}),
		};
	}

	return {
		ok: true,
		render: toRenderEnvelope({
			screenId: input.suiteInput.screenId,
			tree,
		}),
	};
};
