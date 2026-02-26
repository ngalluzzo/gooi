import { z } from "zod";

/**
 * Version identifier for compiled entrypoint bundle artifacts.
 */
export const artifactVersionSchema = z.literal("1.0.0");

/**
 * Version identifier of compiled entrypoint artifacts.
 */
export type ArtifactVersion = z.infer<typeof artifactVersionSchema>;

/**
 * Diagnostic severities emitted during compilation.
 */
export const diagnosticSeveritySchema = z.enum(["error", "warning", "info"]);

/**
 * Supported diagnostic severity values.
 */
export type DiagnosticSeverity = z.infer<typeof diagnosticSeveritySchema>;

/**
 * A structured diagnostic emitted by the compiler.
 */
export interface CompileDiagnostic {
	/** Severity category used by CI gates and CLI output. */
	readonly severity: DiagnosticSeverity;
	/** Stable machine-readable diagnostic code. */
	readonly code: string;
	/** JSON-like path for the failing spec location. */
	readonly path: string;
	/** Human-readable explanation for the diagnostic. */
	readonly message: string;
	/** Optional remediation hint for developers. */
	readonly hint?: string;
}

/**
 * Supported scalar types for compiled entrypoint IO fields.
 */
export const compiledScalarTypeSchema = z.enum([
	"text",
	"id",
	"int",
	"number",
	"bool",
	"timestamp",
]);

/**
 * Scalar type name used in compiled entrypoint field contracts.
 */
export type CompiledScalarType = z.infer<typeof compiledScalarTypeSchema>;

/**
 * One compiled input field contract.
 */
export interface CompiledInputField {
	/** Scalar type that adapters/runtime must respect for this field. */
	readonly scalarType: CompiledScalarType;
	/** True when the field must be present after binding/default application. */
	readonly required: boolean;
}

/**
 * Entrypoint kinds supported by the runtime.
 */
export const compiledEntrypointKindSchema = z.enum(["query", "mutation"]);

/**
 * Compiled entrypoint kind value.
 */
export type CompiledEntrypointKind = z.infer<
	typeof compiledEntrypointKindSchema
>;

/**
 * Compiled query or mutation entrypoint contract.
 */
export interface CompiledEntrypoint {
	/** Entrypoint identifier from authoring spec. */
	readonly id: string;
	/** Entrypoint kind (`query` or `mutation`). */
	readonly kind: CompiledEntrypointKind;
	/** Field contracts used by binders and runtime validation. */
	readonly inputFields: Readonly<Record<string, CompiledInputField>>;
	/** Default input values applied after explicit bindings. */
	readonly defaultInput: Readonly<Record<string, unknown>>;
	/** Role names allowed to invoke this entrypoint. */
	readonly accessRoles: readonly string[];
	/** Key referencing generated input schema artifact. */
	readonly schemaArtifactKey: string;
}

/**
 * Compiled surface binding for one entrypoint.
 */
export interface CompiledSurfaceBinding {
	/** Surface identifier such as `http`, `web`, or `cli`. */
	readonly surfaceId: string;
	/** Entrypoint kind for this binding. */
	readonly entrypointKind: CompiledEntrypointKind;
	/** Entrypoint id resolved by this binding. */
	readonly entrypointId: string;
	/** Mapping from entrypoint input field names to native source paths. */
	readonly fieldBindings: Readonly<Record<string, string>>;
}

/**
 * Compiled query refresh subscription contract.
 */
export interface CompiledRefreshSubscription {
	/** Query id that should refresh when any listed signals are observed. */
	readonly queryId: string;
	/** Sorted unique signal ids that invalidate the query. */
	readonly signalIds: readonly string[];
}

/**
 * Supported role-derivation rule kinds.
 */
export type CompiledRoleDeriveRule =
	| {
			readonly kind: "auth_is_authenticated";
	  }
	| {
			readonly kind: "auth_claim_equals";
			readonly claim: string;
			readonly expected: unknown;
	  };

/**
 * Compiled role definition used by policy gate evaluation.
 */
export interface CompiledRoleDefinition {
	/** Role identifier declared in access policy. */
	readonly roleId: string;
	/** Parent roles that this role extends. */
	readonly extends: readonly string[];
	/** Deterministic role derivation rules. */
	readonly deriveRules: readonly CompiledRoleDeriveRule[];
}

/**
 * Compiled access rules used at invocation policy gate.
 */
export interface CompiledAccessPlan {
	/** Default behavior when entrypoint access is omitted. */
	readonly defaultPolicy: "allow" | "deny";
	/** Known role ids declared by the spec. */
	readonly knownRoles: readonly string[];
	/** Compiled role definitions keyed by role id. */
	readonly roleDefinitions: Readonly<Record<string, CompiledRoleDefinition>>;
	/** Entrypoint role bindings keyed by `<kind>:<id>`. */
	readonly entrypointRoles: Readonly<Record<string, readonly string[]>>;
}

/**
 * Generated JSON Schema artifact used in the compiled bundle.
 */
export interface CompiledJsonSchemaArtifact {
	/** Schema draft target used for generation. */
	readonly target: "draft-7";
	/** Deterministically normalized JSON Schema object. */
	readonly schema: Readonly<Record<string, unknown>>;
	/** SHA-256 hash of normalized schema JSON. */
	readonly hash: string;
}

/**
 * Canonical compiled artifact consumed by entrypoint runtime.
 */
export interface CompiledEntrypointBundle {
	/** Bundle artifact version understood by runtime. */
	readonly artifactVersion: ArtifactVersion;
	/** Compiler version that emitted this bundle. */
	readonly compilerVersion: string;
	/** SHA-256 hash of normalized source spec JSON. */
	readonly sourceSpecHash: string;
	/** SHA-256 hash of normalized compiled bundle JSON excluding this field. */
	readonly artifactHash: string;
	/** Entrypoint contracts keyed by `<kind>:<id>`. */
	readonly entrypoints: Readonly<Record<string, CompiledEntrypoint>>;
	/** Surface bindings keyed by `<surface>:<kind>:<id>`. */
	readonly bindings: Readonly<Record<string, CompiledSurfaceBinding>>;
	/** Refresh subscriptions keyed by query id. */
	readonly refreshSubscriptions: Readonly<
		Record<string, CompiledRefreshSubscription>
	>;
	/** Compiled access rules for policy gate enforcement. */
	readonly accessPlan: CompiledAccessPlan;
	/** Generated input schema artifacts keyed by schemaArtifactKey. */
	readonly schemaArtifacts: Readonly<
		Record<string, CompiledJsonSchemaArtifact>
	>;
}

/**
 * Successful compile result containing a compiled bundle.
 */
export interface CompileEntrypointBundleSuccess {
	/** True when compilation completed without error diagnostics. */
	readonly ok: true;
	/** Compiled artifact bundle consumed by runtime and tests. */
	readonly bundle: CompiledEntrypointBundle;
	/** Non-error diagnostics retained for visibility. */
	readonly diagnostics: readonly CompileDiagnostic[];
}

/**
 * Failed compile result containing diagnostics only.
 */
export interface CompileEntrypointBundleFailure {
	/** False when at least one error diagnostic is emitted. */
	readonly ok: false;
	/** Ordered diagnostic list describing all compilation failures. */
	readonly diagnostics: readonly CompileDiagnostic[];
}

/**
 * Result union for compiling an entrypoint bundle.
 */
export type CompileEntrypointBundleResult =
	| CompileEntrypointBundleSuccess
	| CompileEntrypointBundleFailure;
