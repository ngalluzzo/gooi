import {
	artifactVersionSchema,
	type CompileDiagnostic,
	type CompiledEntrypointBundle,
	type CompiledRoleDefinition,
	type CompiledRoleDeriveRule,
	type CompileEntrypointBundleResult,
} from "@gooi/app-spec-contracts/compiled";
import {
	authoringEntrypointSpecSchema,
	parseAuthoringEntrypointSpec,
} from "@gooi/app-spec-contracts/spec";
import {
	buildPackagedBundle,
	type PackagedAppBundle,
} from "@gooi/artifact-model/bundle";
import { sha256, stableStringify } from "@gooi/stable-json";
import { compileBindingRequirementsArtifact } from "./compile-binding-requirements-artifact";
import { compileBindings } from "./compile-bindings";
import { buildCanonicalSpecModel } from "./compile-canonical-model";
import { compileEntrypoints } from "./compile-entrypoints";
import { compileLaneArtifacts } from "./compile-lane-artifacts";
import { compileReachabilityRequirements } from "./compile-reachability-requirements";
import { compileRefreshSubscriptions } from "./compile-refresh-subscriptions";
import { sortDiagnostics } from "./sort-diagnostics";
import { validateCrossLinks } from "./validate-cross-links";

/**
 * Input payload for compiling a deterministic entrypoint bundle.
 */
export interface CompileEntrypointBundleInput {
	/** Untrusted authoring spec input. */
	readonly spec: unknown;
	/** Compiler version persisted in the output artifact. */
	readonly compilerVersion: string;
}

/**
 * Successful compile result that also includes optional packaged transport artifact.
 */
export interface CompilePackagedEntrypointBundleSuccess {
	readonly ok: true;
	readonly diagnostics: readonly CompileDiagnostic[];
	readonly bundle: CompiledEntrypointBundle;
	readonly packagedBundle: PackagedAppBundle;
}

/**
 * Failed compile result for packaged bundle generation.
 */
export interface CompilePackagedEntrypointBundleFailure {
	readonly ok: false;
	readonly diagnostics: readonly CompileDiagnostic[];
}

/**
 * Result union for optional packaged bundle compilation.
 */
export type CompilePackagedEntrypointBundleResult =
	| CompilePackagedEntrypointBundleSuccess
	| CompilePackagedEntrypointBundleFailure;

const hasErrors = (diagnostics: readonly CompileDiagnostic[]): boolean =>
	diagnostics.some((diagnostic) => diagnostic.severity === "error");

const artifactHashInput = (
	bundle: Omit<CompiledEntrypointBundle, "artifactHash">,
): string => sha256(stableStringify(bundle));

const compileAccessPlan = (
	spec: ReturnType<typeof parseAuthoringEntrypointSpec>,
) => {
	const entrypointRoles: Record<string, readonly string[]> = {};
	const roleDefinitions: Record<string, CompiledRoleDefinition> = {};
	for (const query of spec.queries) {
		entrypointRoles[`query:${query.id}`] = [...query.access.roles];
	}
	for (const mutation of spec.mutations) {
		entrypointRoles[`mutation:${mutation.id}`] = [...mutation.access.roles];
	}

	const parseDeriveRules = (
		roleValue: unknown,
	): readonly CompiledRoleDeriveRule[] => {
		if (roleValue === null || typeof roleValue !== "object") {
			return [];
		}
		const roleRecord = roleValue as Readonly<Record<string, unknown>>;
		const deriveValue = roleRecord.derive;
		if (deriveValue === null || typeof deriveValue !== "object") {
			return [];
		}
		const deriveRecord = deriveValue as Readonly<Record<string, unknown>>;
		const rules: CompiledRoleDeriveRule[] = [];
		for (const [deriveKind, deriveInput] of Object.entries(deriveRecord).sort(
			([left], [right]) => left.localeCompare(right),
		)) {
			if (deriveKind === "auth_is_authenticated") {
				rules.push({ kind: "auth_is_authenticated" });
				continue;
			}
			if (
				deriveKind === "auth_claim_equals" &&
				Array.isArray(deriveInput) &&
				typeof deriveInput[0] === "string"
			) {
				rules.push({
					kind: "auth_claim_equals",
					claim: deriveInput[0],
					expected: deriveInput[1],
				});
			}
		}
		return rules;
	};

	const parseExtends = (roleValue: unknown): readonly string[] => {
		if (roleValue === null || typeof roleValue !== "object") {
			return [];
		}
		const roleRecord = roleValue as Readonly<Record<string, unknown>>;
		const extendsValue = roleRecord.extends;
		if (!Array.isArray(extendsValue)) {
			return [];
		}
		const filtered = extendsValue.filter(
			(entry): entry is string => typeof entry === "string" && entry.length > 0,
		);
		return [...new Set(filtered)];
	};

	for (const roleId of Object.keys(spec.access.roles).sort((left, right) =>
		left.localeCompare(right),
	)) {
		roleDefinitions[roleId] = {
			roleId,
			extends: parseExtends(spec.access.roles[roleId]),
			deriveRules: parseDeriveRules(spec.access.roles[roleId]),
		};
	}

	return {
		defaultPolicy: spec.access.default_policy,
		knownRoles: Object.keys(roleDefinitions),
		roleDefinitions,
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
		const diagnostics = sortDiagnostics(
			parsed.error.issues.map((issue) => ({
				severity: "error",
				code: "authoring_spec_invalid",
				path: issue.path.join("."),
				message: issue.message,
			})),
		);
		return {
			ok: false,
			diagnostics,
		};
	}

	const spec = parseAuthoringEntrypointSpec(parsed.data);
	const canonicalModel = buildCanonicalSpecModel(spec);
	const entrypointOutput = compileEntrypoints(spec);
	const bindingOutput = compileBindings(spec, entrypointOutput.entrypoints);
	const reachabilityOutput = compileReachabilityRequirements(spec);
	const refreshOutput = compileRefreshSubscriptions(
		spec,
		entrypointOutput.entrypoints,
	);
	const diagnostics = sortDiagnostics([
		...validateCrossLinks(canonicalModel),
		...entrypointOutput.diagnostics,
		...bindingOutput.diagnostics,
		...reachabilityOutput.diagnostics,
		...refreshOutput.diagnostics,
	]);

	if (hasErrors(diagnostics)) {
		return { ok: false, diagnostics };
	}

	const artifactVersion = artifactVersionSchema.value;
	const sourceSpecHash = sha256(stableStringify(spec));
	const accessPlan = compileAccessPlan(spec);
	const bindingRequirementsArtifact = compileBindingRequirementsArtifact(
		reachabilityOutput.requirements,
	);
	const laneArtifactOutput = compileLaneArtifacts({
		canonicalModel,
		entrypoints: entrypointOutput.entrypoints,
		bindings: bindingOutput.bindings,
		refreshSubscriptions: refreshOutput.subscriptions,
		accessPlan,
		schemaArtifacts: entrypointOutput.schemaArtifacts,
		bindingRequirementsArtifact,
	});
	const artifactManifest = laneArtifactOutput.artifactManifest;
	const partialBundle: Omit<CompiledEntrypointBundle, "artifactHash"> = {
		artifactVersion,
		compilerVersion: input.compilerVersion,
		sourceSpecHash,
		sections: canonicalModel.sections,
		entrypoints: entrypointOutput.entrypoints,
		bindings: bindingOutput.bindings,
		reachabilityRequirements: reachabilityOutput.requirements,
		bindingRequirementsArtifact,
		artifactManifest,
		laneArtifacts: laneArtifactOutput.laneArtifacts,
		refreshSubscriptions: refreshOutput.subscriptions,
		accessPlan,
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

/**
 * Compiles source spec and emits optional packaged transport bundle.
 */
export const compilePackagedEntrypointBundle = (
	input: CompileEntrypointBundleInput,
): CompilePackagedEntrypointBundleResult => {
	const compiled = compileEntrypointBundle(input);
	if (!compiled.ok) {
		return {
			ok: false,
			diagnostics: compiled.diagnostics,
		};
	}

	const packagedBundle = buildPackagedBundle({
		manifest: compiled.bundle.artifactManifest,
		artifacts: compiled.bundle.laneArtifacts,
	});
	return {
		ok: true,
		diagnostics: compiled.diagnostics,
		bundle: compiled.bundle,
		packagedBundle,
	};
};
