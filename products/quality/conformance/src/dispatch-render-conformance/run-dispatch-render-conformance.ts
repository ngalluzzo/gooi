import type { RenderDiagnosticEnvelope } from "@gooi/render-contracts/envelopes";
import { stableStringify } from "@gooi/stable-json";
import type {
	DispatchRenderConformanceReport,
	RunDispatchRenderConformanceInput,
} from "./contracts";
import {
	type DispatchRenderAttempt,
	dispatchRuntimeRender,
} from "./dispatch-runtime-render";

const buildCheck = (
	id: DispatchRenderConformanceReport["checks"][number]["id"],
	passed: boolean,
	detail: string,
): DispatchRenderConformanceReport["checks"][number] => ({
	id,
	passed,
	detail,
});

const collectDiagnostics = (
	attempts: readonly DispatchRenderAttempt[],
): readonly RenderDiagnosticEnvelope[] =>
	attempts
		.filter(
			(attempt): attempt is Extract<DispatchRenderAttempt, { ok: false }> =>
				!attempt.ok,
		)
		.map((attempt) => attempt.diagnostic);

/**
 * Runs dispatch-to-render pipeline conformance checks.
 */
export const runDispatchRenderConformance = async (
	input: RunDispatchRenderConformanceInput,
): Promise<DispatchRenderConformanceReport> => {
	const checks: Array<DispatchRenderConformanceReport["checks"][number]> = [];

	const success = await dispatchRuntimeRender({
		suiteInput: input,
		ingress: input.routeIngress,
		principal: input.authorizedPrincipal,
		traceSeed: "success_1",
	});
	checks.push(
		buildCheck(
			"route_dispatch_renders_output",
			success.ok,
			success.ok
				? "Route dispatch flowed through runtime and produced rendered output."
				: `Expected rendered output, received ${success.diagnostic.code}.`,
		),
	);

	const malformed = await dispatchRuntimeRender({
		suiteInput: input,
		ingress: input.malformedIngress,
		principal: input.authorizedPrincipal,
		traceSeed: "malformed",
	});
	const unauthorized = await dispatchRuntimeRender({
		suiteInput: input,
		ingress: input.routeIngress,
		principal: input.unauthorizedPrincipal,
		traceSeed: "unauthorized",
	});
	const typedErrorsPreserved =
		!malformed.ok &&
		malformed.diagnostic.code === "dispatch_transport_error" &&
		!unauthorized.ok &&
		unauthorized.diagnostic.code === "access_denied_error";
	checks.push(
		buildCheck(
			"typed_error_envelopes_preserved",
			typedErrorsPreserved,
			typedErrorsPreserved
				? "Dispatch/runtime typed envelopes are preserved by render adapter diagnostics."
				: "Expected dispatch_transport_error and access_denied_error passthrough diagnostics.",
		),
	);

	const repeated = await dispatchRuntimeRender({
		suiteInput: input,
		ingress: input.routeIngress,
		principal: input.authorizedPrincipal,
		traceSeed: "success_2",
	});
	const deterministic =
		success.ok &&
		repeated.ok &&
		stableStringify(success.render) === stableStringify(repeated.render);
	checks.push(
		buildCheck(
			"deterministic_render_output",
			deterministic,
			deterministic
				? "Repeated equivalent requests produced equivalent rendered outputs."
				: "Rendered outputs diverged for equivalent requests.",
		),
	);

	const diagnostics = collectDiagnostics([malformed, unauthorized]);

	return {
		passed: checks.every((check) => check.passed),
		checks,
		...(success.ok ? { render: success.render } : {}),
		...(diagnostics.length === 0 ? {} : { diagnostics }),
	};
};
