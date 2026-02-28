import type {
	CompileDiagnostic,
	CompiledEntrypoint,
} from "@gooi/app-spec-contracts/compiled";
import type { AuthoringEntrypointSpec } from "@gooi/app-spec-contracts/spec";
import type {
	CompiledDispatchHandler,
	CompiledSurfaceDispatchPlanSet,
	DispatchEntrypointKind,
} from "@gooi/surface-contracts/dispatch";
import {
	dispatchKinds,
	matcherFromSurfaceBinding,
	matcherSignature,
	matcherSpecificity,
	resolveEntrypointFields,
	routeInputFieldContracts,
	sortHandlers,
} from "./dispatch/dispatch-plan-helpers";

interface CompileDispatchPlansOutput {
	readonly dispatchPlans: CompiledSurfaceDispatchPlanSet;
	readonly diagnostics: readonly CompileDiagnostic[];
}

const dispatchPlanArtifactVersion = "1.0.0" as const;
const sectionKeyByKind: Readonly<Record<DispatchEntrypointKind, string>> = {
	query: "queries",
	mutation: "mutations",
	route: "routes",
};

const pushBindingFieldDiagnostics = (
	diagnostics: CompileDiagnostic[],
	fields: Readonly<Record<string, unknown>>,
	surfaceId: string,
	kind: DispatchEntrypointKind,
	entrypointId: string,
	bindingRecord: Readonly<Record<string, unknown>>,
): void => {
	const sectionKey = sectionKeyByKind[kind];
	for (const fieldName of Object.keys(
		(bindingRecord.bind ?? {}) as Readonly<Record<string, string>>,
	)) {
		if (fields[fieldName] !== undefined) {
			continue;
		}
		diagnostics.push({
			severity: "error",
			code: "dispatch_binding_field_not_declared",
			path: `wiring.surfaces.${surfaceId}.${sectionKey}.${entrypointId}.bind.${fieldName}`,
			message: `Dispatch binding field \`${fieldName}\` is not declared by ${kind} \`${entrypointId}\`.`,
		});
	}
};

const pushAmbiguityDiagnostics = (
	diagnostics: CompileDiagnostic[],
	plans: Readonly<
		Record<
			string,
			{
				readonly surfaceId: string;
				readonly handlers: readonly CompiledDispatchHandler[];
			}
		>
	>,
): void => {
	for (const plan of Object.values(plans)) {
		const grouped: Record<string, CompiledDispatchHandler[]> = {};
		for (const handler of plan.handlers) {
			const key = `${matcherSignature(handler.matcher)}:${handler.specificity}`;
			const bucket = grouped[key] ?? [];
			bucket.push(handler);
			grouped[key] = bucket;
		}
		for (const [signature, matches] of Object.entries(grouped)) {
			if (matches.length < 2) {
				continue;
			}
			diagnostics.push({
				severity: "error",
				code: "dispatch_matcher_ambiguous",
				path: `wiring.surfaces.${plan.surfaceId}`,
				message: `Ambiguous dispatch handlers share matcher signature \`${signature}\`: ${matches
					.map((item) => item.handlerId)
					.sort()
					.join(", ")}.`,
			});
		}
	}
};

/**
 * Compiles deterministic dispatch plans for configured surfaces.
 */
export const compileDispatchPlans = (
	spec: AuthoringEntrypointSpec,
	entrypoints: Readonly<Record<string, CompiledEntrypoint>>,
): CompileDispatchPlansOutput => {
	const diagnostics: CompileDiagnostic[] = [];
	const routeInputs = routeInputFieldContracts(spec, diagnostics);
	const plans: Record<
		string,
		{ surfaceId: string; handlers: CompiledDispatchHandler[] }
	> = {};

	for (const [surfaceId, surface] of Object.entries(spec.wiring.surfaces)) {
		const handlers: CompiledDispatchHandler[] = [];
		for (const kind of dispatchKinds) {
			const configured = surface[sectionKeyByKind[kind]] ?? {};
			for (const [entrypointId, binding] of Object.entries(configured)) {
				const fields = resolveEntrypointFields(
					kind,
					entrypointId,
					entrypoints,
					routeInputs,
				);
				if (fields === undefined) {
					diagnostics.push({
						severity: "error",
						code: "dispatch_entrypoint_not_found",
						path: `wiring.surfaces.${surfaceId}.${sectionKeyByKind[kind]}.${entrypointId}`,
						message: `Dispatch references unknown ${kind} entrypoint \`${entrypointId}\`.`,
					});
					continue;
				}

				const bindingRecord = binding as Readonly<Record<string, unknown>>;
				pushBindingFieldDiagnostics(
					diagnostics,
					fields,
					surfaceId,
					kind,
					entrypointId,
					bindingRecord,
				);

				const matcher = matcherFromSurfaceBinding(
					surfaceId,
					kind,
					entrypointId,
					bindingRecord,
				);
				if (matcher.kind === "invalid") {
					diagnostics.push({
						severity: "error",
						code: "dispatch_matcher_invalid",
						path: `wiring.surfaces.${surfaceId}.${sectionKeyByKind[kind]}.${entrypointId}.x-dispatch.matcher`,
						message: `Dispatch matcher is invalid: ${matcher.message}`,
					});
					continue;
				}
				if (matcher.kind === "missing") {
					diagnostics.push({
						severity: "error",
						code: "dispatch_matcher_missing",
						path: `wiring.surfaces.${surfaceId}.${sectionKeyByKind[kind]}.${entrypointId}`,
						message: `Dispatch matcher is missing or invalid for surface \`${surfaceId}\`.`,
					});
					continue;
				}

				handlers.push({
					handlerId: `${surfaceId}:${kind}:${entrypointId}`,
					surfaceId,
					matcher: matcher.matcher,
					specificity: matcherSpecificity(matcher.matcher),
					target: {
						entrypointKind: kind,
						entrypointId,
						fieldBindings: {
							...((bindingRecord.bind ?? {}) as Record<string, string>),
						},
					},
				});
			}
		}

		plans[surfaceId] = { surfaceId, handlers: [...sortHandlers(handlers)] };
	}

	pushAmbiguityDiagnostics(diagnostics, plans);

	return {
		diagnostics,
		dispatchPlans: {
			artifactVersion: dispatchPlanArtifactVersion,
			plans,
		},
	};
};
