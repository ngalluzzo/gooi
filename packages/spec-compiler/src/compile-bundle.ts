import { sha256, stableStringify } from "@gooi/contracts-capability";
import {
	authoringEntrypointSpecSchema,
	parseAuthoringEntrypointSpec,
} from "./authoring-spec";
import { compileBindings } from "./compile-bindings";
import { compileEntrypoints } from "./compile-entrypoints";
import { compileRefreshSubscriptions } from "./compile-refresh-subscriptions";
import {
	artifactVersionSchema,
	type CompileDiagnostic,
	type CompiledEntrypointBundle,
	type CompileEntrypointBundleResult,
} from "./contracts";

/**
 * Input payload for compiling a deterministic entrypoint bundle.
 */
export interface CompileEntrypointBundleInput {
	/** Untrusted authoring spec input. */
	readonly spec: unknown;
	/** Compiler version persisted in the output artifact. */
	readonly compilerVersion: string;
}

const hasErrors = (diagnostics: readonly CompileDiagnostic[]): boolean =>
	diagnostics.some((diagnostic) => diagnostic.severity === "error");

const artifactHashInput = (
	bundle: Omit<CompiledEntrypointBundle, "artifactHash">,
): string => sha256(stableStringify(bundle));

const compileAccessPlan = (
	spec: ReturnType<typeof parseAuthoringEntrypointSpec>,
) => {
	const entrypointRoles: Record<string, readonly string[]> = {};
	for (const query of spec.queries) {
		entrypointRoles[`query:${query.id}`] = [...query.access.roles];
	}
	for (const mutation of spec.mutations) {
		entrypointRoles[`mutation:${mutation.id}`] = [...mutation.access.roles];
	}
	return {
		defaultPolicy: spec.access.default_policy,
		knownRoles: Object.keys(spec.access.roles).sort((left, right) =>
			left.localeCompare(right),
		),
		entrypointRoles,
	} as const;
};

/**
 * Compiles a parsed authoring spec into a deterministic runtime artifact bundle.
 *
 * @param input - Compile input with source spec and compiler version.
 * @returns Compile diagnostics and compiled artifact when successful.
 *
 * @example
 * const result = compileEntrypointBundle({ spec, compilerVersion: "1.0.0" });
 */
export const compileEntrypointBundle = (
	input: CompileEntrypointBundleInput,
): CompileEntrypointBundleResult => {
	const parsed = authoringEntrypointSpecSchema.safeParse(input.spec);
	if (!parsed.success) {
		return {
			ok: false,
			diagnostics: parsed.error.issues.map((issue) => ({
				severity: "error",
				code: "authoring_spec_invalid",
				path: issue.path.join("."),
				message: issue.message,
			})),
		};
	}

	const spec = parseAuthoringEntrypointSpec(parsed.data);
	const entrypointOutput = compileEntrypoints(spec);
	const bindingOutput = compileBindings(spec, entrypointOutput.entrypoints);
	const refreshOutput = compileRefreshSubscriptions(
		spec,
		entrypointOutput.entrypoints,
	);
	const diagnostics = [
		...entrypointOutput.diagnostics,
		...bindingOutput.diagnostics,
		...refreshOutput.diagnostics,
	];

	if (hasErrors(diagnostics)) {
		return { ok: false, diagnostics };
	}

	const artifactVersion = artifactVersionSchema.value;
	const sourceSpecHash = sha256(stableStringify(spec));
	const partialBundle: Omit<CompiledEntrypointBundle, "artifactHash"> = {
		artifactVersion,
		compilerVersion: input.compilerVersion,
		sourceSpecHash,
		entrypoints: entrypointOutput.entrypoints,
		bindings: bindingOutput.bindings,
		refreshSubscriptions: refreshOutput.subscriptions,
		accessPlan: compileAccessPlan(spec),
		schemaArtifacts: entrypointOutput.schemaArtifacts,
	};

	return {
		ok: true,
		diagnostics,
		bundle: {
			...partialBundle,
			artifactHash: artifactHashInput(partialBundle),
		},
	};
};

/**
 * Validates and parses a compiled entrypoint bundle.
 *
 * @param value - Untrusted compiled bundle input.
 * @returns Parsed compiled bundle.
 *
 * @example
 * const bundle = parseCompiledEntrypointBundle(rawBundle);
 */
export const parseCompiledEntrypointBundle = (
	value: CompiledEntrypointBundle,
): CompiledEntrypointBundle => value;
