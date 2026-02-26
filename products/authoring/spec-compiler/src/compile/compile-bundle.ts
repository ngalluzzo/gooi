import { sha256, stableStringify } from "@gooi/stable-json";
import {
	authoringEntrypointSpecSchema,
	parseAuthoringEntrypointSpec,
} from "../authoring-spec/authoring-spec";
import {
	artifactVersionSchema,
	type CompileDiagnostic,
	type CompiledEntrypointBundle,
	type CompiledRoleDefinition,
	type CompiledRoleDeriveRule,
	type CompileEntrypointBundleResult,
} from "./compile.contracts";
import {
	compileArtifactManifest,
	compileBindingRequirementsArtifact,
} from "./compile-binding-requirements-artifact";
import { compileBindings } from "./compile-bindings";
import { compileEntrypoints } from "./compile-entrypoints";
import { compileReachabilityRequirements } from "./compile-reachability-requirements";
import { compileRefreshSubscriptions } from "./compile-refresh-subscriptions";

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
	const reachabilityOutput = compileReachabilityRequirements(spec);
	const refreshOutput = compileRefreshSubscriptions(
		spec,
		entrypointOutput.entrypoints,
	);
	const diagnostics = [
		...entrypointOutput.diagnostics,
		...bindingOutput.diagnostics,
		...reachabilityOutput.diagnostics,
		...refreshOutput.diagnostics,
	];

	if (hasErrors(diagnostics)) {
		return { ok: false, diagnostics };
	}

	const artifactVersion = artifactVersionSchema.value;
	const sourceSpecHash = sha256(stableStringify(spec));
	const bindingRequirementsArtifact = compileBindingRequirementsArtifact(
		reachabilityOutput.requirements,
	);
	const artifactManifest = compileArtifactManifest(bindingRequirementsArtifact);
	const partialBundle: Omit<CompiledEntrypointBundle, "artifactHash"> = {
		artifactVersion,
		compilerVersion: input.compilerVersion,
		sourceSpecHash,
		entrypoints: entrypointOutput.entrypoints,
		bindings: bindingOutput.bindings,
		reachabilityRequirements: reachabilityOutput.requirements,
		bindingRequirementsArtifact,
		artifactManifest,
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
