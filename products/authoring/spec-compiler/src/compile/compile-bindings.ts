import type { AuthoringEntrypointSpec } from "../authoring-spec/authoring-spec";
import type {
	CompileDiagnostic,
	CompiledEntrypoint,
	CompiledEntrypointKind,
	CompiledSurfaceBinding,
} from "./compile.contracts";

interface CompileBindingsOutput {
	readonly bindings: Readonly<Record<string, CompiledSurfaceBinding>>;
	readonly diagnostics: readonly CompileDiagnostic[];
}

const entrypointKey = (kind: CompiledEntrypointKind, id: string): string =>
	`${kind}:${id}`;

const bindingKey = (
	surfaceId: string,
	kind: CompiledEntrypointKind,
	entrypointId: string,
): string => `${surfaceId}:${kind}:${entrypointId}`;

const compileOneBinding = (
	surfaceId: string,
	kind: CompiledEntrypointKind,
	entrypointId: string,
	fieldBindings: Readonly<Record<string, string>>,
	entrypoints: Readonly<Record<string, CompiledEntrypoint>>,
): {
	readonly binding: CompiledSurfaceBinding | null;
	readonly diagnostics: readonly CompileDiagnostic[];
} => {
	const diagnostics: CompileDiagnostic[] = [];
	const target = entrypoints[entrypointKey(kind, entrypointId)];
	if (target === undefined) {
		diagnostics.push({
			severity: "error",
			code: "binding_entrypoint_not_found",
			path: `wiring.surfaces.${surfaceId}.${kind}s.${entrypointId}`,
			message: `No compiled ${kind} entrypoint exists for \`${entrypointId}\`.`,
		});
		return { binding: null, diagnostics };
	}

	for (const fieldName of Object.keys(fieldBindings)) {
		if (target.inputFields[fieldName] === undefined) {
			diagnostics.push({
				severity: "error",
				code: "binding_field_not_declared",
				path: `wiring.surfaces.${surfaceId}.${kind}s.${entrypointId}.bind.${fieldName}`,
				message: `Field \`${fieldName}\` is not declared by ${kind} \`${entrypointId}\` input contract.`,
			});
		}
	}

	return {
		binding: {
			surfaceId,
			entrypointKind: kind,
			entrypointId,
			fieldBindings,
		},
		diagnostics,
	};
};

/**
 * Compiles surface binding declarations for query and mutation entrypoints.
 *
 * @param spec - Parsed authoring spec.
 * @param entrypoints - Compiled entrypoints keyed by `<kind>:<id>`.
 * @returns Compiled bindings and diagnostics.
 *
 * @example
 * const output = compileBindings(spec, entrypoints);
 */
export const compileBindings = (
	spec: AuthoringEntrypointSpec,
	entrypoints: Readonly<Record<string, CompiledEntrypoint>>,
): CompileBindingsOutput => {
	const bindings: Record<string, CompiledSurfaceBinding> = {};
	const diagnostics: CompileDiagnostic[] = [];

	for (const [surfaceId, surface] of Object.entries(spec.wiring.surfaces)) {
		const queries = surface.queries ?? {};
		for (const [entrypointId, wiredQuery] of Object.entries(queries)) {
			const compiled = compileOneBinding(
				surfaceId,
				"query",
				entrypointId,
				wiredQuery.bind,
				entrypoints,
			);
			if (compiled.binding !== null) {
				bindings[bindingKey(surfaceId, "query", entrypointId)] =
					compiled.binding;
			}
			diagnostics.push(...compiled.diagnostics);
		}

		const mutations = surface.mutations ?? {};
		for (const [entrypointId, wiredMutation] of Object.entries(mutations)) {
			const compiled = compileOneBinding(
				surfaceId,
				"mutation",
				entrypointId,
				wiredMutation.bind,
				entrypoints,
			);
			if (compiled.binding !== null) {
				bindings[bindingKey(surfaceId, "mutation", entrypointId)] =
					compiled.binding;
			}
			diagnostics.push(...compiled.diagnostics);
		}
	}

	return { bindings, diagnostics };
};
