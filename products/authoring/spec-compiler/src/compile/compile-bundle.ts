import {
	type CompileDiagnostic,
	type CompiledEntrypointBundle,
	type CompileEntrypointBundleResult,
	compiledContracts,
} from "@gooi/app-spec-contracts/compiled";
import { specContracts } from "@gooi/app-spec-contracts/spec";
import {
	buildPackagedBundle,
	type PackagedAppBundle,
} from "@gooi/artifact-model/bundle";
import { sha256, stableStringify } from "@gooi/stable-json";
import { compileAccessPlan } from "./compile-access-plan";
import { compileBindingRequirementsArtifact } from "./compile-binding-requirements-artifact";
import { compileBindings } from "./compile-bindings";
import { buildCanonicalSpecModel } from "./compile-canonical-model";
import { compileDispatchPlans } from "./compile-dispatch-plans";
import { compileDomainRuntimeIR } from "./compile-domain-runtime-ir";
import { compileEntrypoints } from "./compile-entrypoints";
import { compileLaneArtifacts } from "./compile-lane-artifacts";
import { compileProjectionIR } from "./compile-projection-ir";
import { compileReachabilityRequirements } from "./compile-reachability-requirements";
import { compileRefreshSubscriptions } from "./compile-refresh-subscriptions";
import { compileScenarioIR } from "./compile-scenario-ir";
import { compileSessionIR } from "./compile-session-ir";
import { compileViewRenderIR } from "./compile-view-render-ir";
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
const { parseAuthoringEntrypointSpec, authoringEntrypointSpecSchema } =
	specContracts;
const { artifactVersionSchema } = compiledContracts;

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
	const dispatchOutput = compileDispatchPlans(
		spec,
		entrypointOutput.entrypoints,
	);
	const reachabilityOutput = compileReachabilityRequirements(spec);
	const refreshOutput = compileRefreshSubscriptions(
		spec,
		entrypointOutput.entrypoints,
	);
	const projectionOutput = compileProjectionIR({
		model: canonicalModel,
		entrypoints: entrypointOutput.entrypoints,
	});
	const viewRenderOutput = compileViewRenderIR(canonicalModel);
	const domainRuntimeOutput = compileDomainRuntimeIR({
		model: canonicalModel,
	});
	const sessionOutput = compileSessionIR({
		model: canonicalModel,
	});
	const scenarioOutput = compileScenarioIR({
		model: canonicalModel,
	});
	const diagnostics = sortDiagnostics([
		...validateCrossLinks(canonicalModel),
		...entrypointOutput.diagnostics,
		...bindingOutput.diagnostics,
		...dispatchOutput.diagnostics,
		...reachabilityOutput.diagnostics,
		...refreshOutput.diagnostics,
		...projectionOutput.diagnostics,
		...viewRenderOutput.diagnostics,
		...domainRuntimeOutput.diagnostics,
		...sessionOutput.diagnostics,
		...scenarioOutput.diagnostics,
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
		dispatchPlans: dispatchOutput.dispatchPlans,
		refreshSubscriptions: refreshOutput.subscriptions,
		accessPlan,
		schemaArtifacts: entrypointOutput.schemaArtifacts,
		projectionIR: projectionOutput.projectionIR,
		viewRenderIR: viewRenderOutput.viewRenderIR,
		domainRuntimeIR: domainRuntimeOutput.domainRuntimeIR,
		sessionIR: sessionOutput.sessionIR,
		scenarioIR: scenarioOutput.scenarioIR,
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
		dispatchPlans: dispatchOutput.dispatchPlans,
		reachabilityRequirements: reachabilityOutput.requirements,
		bindingRequirementsArtifact,
		artifactManifest,
		laneArtifacts: laneArtifactOutput.laneArtifacts,
		projectionIR: projectionOutput.projectionIR,
		viewRenderIR: viewRenderOutput.viewRenderIR,
		domainRuntimeIR: domainRuntimeOutput.domainRuntimeIR,
		sessionIR: sessionOutput.sessionIR,
		scenarioIR: scenarioOutput.scenarioIR,
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
