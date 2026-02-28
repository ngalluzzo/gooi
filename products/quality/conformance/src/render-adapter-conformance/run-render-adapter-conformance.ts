import { validateRendererAdapterCompatibility } from "@gooi/surface-runtime";
import type {
	RenderAdapterConformanceReport,
	RunRenderAdapterConformanceInput,
} from "./contracts";

const buildCheck = (
	id: RenderAdapterConformanceReport["checks"][number]["id"],
	passed: boolean,
	detail: string,
): RenderAdapterConformanceReport["checks"][number] => ({
	id,
	passed,
	detail,
});

/**
 * Runs renderer adapter compatibility conformance checks.
 */
export const runRenderAdapterConformance = (
	input: RunRenderAdapterConformanceInput,
): RenderAdapterConformanceReport => {
	const checks: Array<RenderAdapterConformanceReport["checks"][number]> = [];
	const supported = validateRendererAdapterCompatibility({
		viewRenderIR: input.viewRenderIR,
		capabilities: input.supportedCapabilities,
	});
	checks.push(
		buildCheck(
			"supported_component_path",
			supported.ok,
			supported.ok
				? "Supported renderer adapter path has no capability diagnostics."
				: `Expected no diagnostics, received ${supported.diagnostics.length}.`,
		),
	);

	const unsupported = validateRendererAdapterCompatibility({
		viewRenderIR: input.viewRenderIR,
		capabilities: input.unsupportedCapabilities,
	});
	const hasCapabilityMismatch = unsupported.diagnostics.some(
		(item) => item.code === "render_adapter_capability_error",
	);
	checks.push(
		buildCheck(
			"unsupported_component_path",
			!unsupported.ok && hasCapabilityMismatch,
			!unsupported.ok && hasCapabilityMismatch
				? "Unsupported renderer adapter path emits typed capability diagnostics."
				: "Expected typed capability diagnostics for unsupported renderer path.",
		),
	);

	return {
		passed: checks.every((check) => check.passed),
		checks,
		...(unsupported.diagnostics.length === 0
			? {}
			: { diagnostics: unsupported.diagnostics }),
	};
};
