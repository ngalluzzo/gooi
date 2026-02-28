import { stableStringify } from "@gooi/stable-json";
import {
	createSurfaceAdapterRegistry,
	defaultSurfaceAdapters,
	dispatchAndBindSurfaceIngress,
} from "@gooi/surface-runtime";
import type {
	RunSurfaceExtensionConformanceInput,
	SurfaceExtensionConformanceReport,
	SurfaceExtensionDispatchSnapshot,
} from "./contracts";

type DispatchAttempt =
	| {
			readonly ok: true;
			readonly snapshot: SurfaceExtensionDispatchSnapshot;
	  }
	| {
			readonly ok: false;
			readonly error: import("@gooi/surface-contracts/dispatch").DispatchError;
	  };

const buildCheck = (
	id: SurfaceExtensionConformanceReport["checks"][number]["id"],
	passed: boolean,
	detail: string,
): SurfaceExtensionConformanceReport["checks"][number] => ({
	id,
	passed,
	detail,
});

const dispatchWithExtension = (
	input: RunSurfaceExtensionConformanceInput,
	ingress: unknown,
): DispatchAttempt => {
	const adapterRegistry = createSurfaceAdapterRegistry([
		...defaultSurfaceAdapters,
		input.extensionAdapter,
	]);
	const result = dispatchAndBindSurfaceIngress({
		surfaceId: input.surfaceId,
		ingress,
		dispatchPlans: input.dispatchPlans,
		entrypoints: input.entrypoints,
		bindings: input.bindings,
		adapterRegistry,
	});

	if (!result.ok) {
		return {
			ok: false,
			error: result.error,
		};
	}

	return {
		ok: true,
		snapshot: {
			surfaceId: result.surfaceId,
			invocationHost: result.invocationHost,
			entrypointKind: result.dispatch.entrypointKind,
			entrypointId: result.dispatch.entrypointId,
			boundInput: result.boundInput,
		},
	};
};

/**
 * Runs reusable surface-extension conformance checks for one custom adapter.
 */
export const runSurfaceExtensionConformance = (
	input: RunSurfaceExtensionConformanceInput,
): SurfaceExtensionConformanceReport => {
	const checks: Array<SurfaceExtensionConformanceReport["checks"][number]> = [];

	const first = dispatchWithExtension(input, input.successIngress);
	const extensionWithoutCoreChanges =
		first.ok &&
		first.snapshot.entrypointKind === input.expectedEntrypointKind &&
		first.snapshot.entrypointId === input.expectedEntrypointId &&
		stableStringify(first.snapshot.boundInput) ===
			stableStringify(input.expectedBoundInput);
	checks.push(
		buildCheck(
			"adapter_extension_without_core_changes",
			extensionWithoutCoreChanges,
			extensionWithoutCoreChanges
				? "Custom surface adapter resolved dispatch/bind without runtime semantic changes."
				: "Custom surface adapter failed to produce the expected dispatch/bind outcome.",
		),
	);

	const malformed = dispatchWithExtension(input, input.malformedIngress);
	const typedFailureDiagnostic =
		!malformed.ok && malformed.error.code === "dispatch_transport_error";
	checks.push(
		buildCheck(
			"typed_extension_failure_diagnostics",
			typedFailureDiagnostic,
			typedFailureDiagnostic
				? "Malformed extension ingress emitted typed transport diagnostics."
				: "Expected dispatch_transport_error for malformed extension ingress.",
		),
	);

	const repeated = dispatchWithExtension(input, input.successIngress);
	const deterministic =
		first.ok &&
		repeated.ok &&
		stableStringify(first.snapshot) === stableStringify(repeated.snapshot);
	checks.push(
		buildCheck(
			"deterministic_extension_dispatch",
			deterministic,
			deterministic
				? "Repeated extension requests produced equivalent dispatch outcomes."
				: "Equivalent extension requests diverged in dispatch output.",
		),
	);

	const diagnostics: import("@gooi/surface-contracts/dispatch").DispatchError[] =
		[];
	if (!malformed.ok) {
		diagnostics.push(malformed.error);
	}

	return {
		passed: checks.every((check) => check.passed),
		checks,
		...(first.ok ? { snapshot: first.snapshot } : {}),
		...(diagnostics.length === 0 ? {} : { diagnostics }),
	};
};
