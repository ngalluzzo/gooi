import type {
	CompiledArtifactManifest as ArtifactModelCompiledArtifactManifest,
	CompiledLaneArtifact,
} from "@gooi/artifact-model/manifest";
import type { HostProviderSchemaProfile } from "@gooi/capability-contracts/capability-port";
import type { JsonObject, JsonValue } from "@gooi/contract-primitives/json";
import type { CompiledViewRenderIR } from "@gooi/render-contracts/ir";
import type { CompiledSurfaceDispatchPlanSet } from "@gooi/surface-contracts/dispatch";
import { z } from "zod";
import {
	type DiagnosticRecord as SharedDiagnosticRecord,
	type DiagnosticSeverity as SharedDiagnosticSeverity,
	diagnosticSeveritySchema as sharedDiagnosticSeveritySchema,
} from "../diagnostics/diagnostics";

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
export const diagnosticSeveritySchema = sharedDiagnosticSeveritySchema;

/**
 * Supported diagnostic severity values.
 */
export type DiagnosticSeverity = SharedDiagnosticSeverity;

/**
 * A structured diagnostic emitted by the compiler.
 */
export interface CompileDiagnostic extends SharedDiagnosticRecord {
	/** Severity category used by CI gates and CLI output. */
	readonly severity: DiagnosticSeverity;
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
 * Reachability modes supported by runtime and resolver contracts.
 */
export const compiledReachabilityModeSchema = z.enum([
	"local",
	"delegated",
	"unreachable",
]);

/**
 * Reachability mode value for required capabilities.
 */
export type CompiledReachabilityMode = z.infer<
	typeof compiledReachabilityModeSchema
>;

/**
 * Canonical reachability requirement for one capability.
 */
export interface CompiledReachabilityRequirement {
	/** Capability port identifier. */
	readonly portId: string;
	/** Capability port semantic version. */
	readonly portVersion: string;
	/** Required execution reachability mode. */
	readonly mode: CompiledReachabilityMode;
}

/**
 * Version identifier for compiled binding requirements artifacts.
 */
export const compiledBindingRequirementsArtifactVersionSchema =
	z.literal("1.0.0");

/**
 * Version identifier of the compiled binding requirements artifact.
 */
export type CompiledBindingRequirementsArtifactVersion = z.infer<
	typeof compiledBindingRequirementsArtifactVersionSchema
>;

/**
 * Version identifier for compiled artifact manifest outputs.
 */
export const compiledArtifactManifestVersionSchema = z.literal("2.0.0");

/**
 * Version identifier of the compiled artifact manifest.
 */
export type CompiledArtifactManifestVersion = z.infer<
	typeof compiledArtifactManifestVersionSchema
>;

/**
 * Compatibility metadata for deployment resolver/runtime consumers.
 */
export interface CompiledBindingRequirementsCompatibility {
	/** Resolver input contract this artifact satisfies. */
	readonly resolverInputContract: "CapabilityReachabilityRequirement@1.0.0";
	/** Runtime resolution contract this artifact targets. */
	readonly runtimeResolutionContract: "CapabilityBindingResolution@1.0.0";
	/** Reachability modes guaranteed by this artifact. */
	readonly supportedModes: readonly CompiledReachabilityMode[];
}

/**
 * Deterministic deployment resolver input artifact for binding requirements.
 */
export interface CompiledBindingRequirements {
	/** Stable artifact identity used by manifest references. */
	readonly artifactId: "CompiledBindingRequirements";
	/** Binding requirements artifact schema version. */
	readonly artifactVersion: CompiledBindingRequirementsArtifactVersion;
	/** Canonical requirements keyed by `<portId>@<portVersion>`. */
	readonly requirements: Readonly<
		Record<string, CompiledReachabilityRequirement>
	>;
	/** Compatibility metadata for resolver/runtime contract handoff. */
	readonly compatibility: CompiledBindingRequirementsCompatibility;
	/** SHA-256 hash of normalized artifact JSON excluding this field. */
	readonly artifactHash: string;
}

/**
 * Deterministic manifest of lane artifact references.
 */
export type CompiledArtifactManifest = ArtifactModelCompiledArtifactManifest;

/**
 * Deterministic lane artifacts keyed by canonical artifact role id.
 */
export type CompiledLaneArtifacts = Readonly<
	Record<string, CompiledLaneArtifact>
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
	readonly defaultInput: JsonObject;
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
			readonly expected: JsonValue;
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
	readonly target: HostProviderSchemaProfile;
	/** Deterministically normalized JSON Schema object. */
	readonly schema: JsonObject;
	/** SHA-256 hash of normalized schema JSON. */
	readonly hash: string;
}

/**
 * Canonical compiled section snapshots for full app-spec coverage.
 */
export interface CompiledCanonicalSections {
	/** Compiled `app` section. */
	readonly app: JsonObject;
	/** Compiled `domain` section. */
	readonly domain: JsonObject;
	/** Compiled `session` section. */
	readonly session: JsonObject;
	/** Compiled `views` section. */
	readonly views: JsonObject;
	/** Compiled `routes` section. */
	readonly routes: readonly JsonObject[];
	/** Compiled `personas` section. */
	readonly personas: JsonObject;
	/** Compiled `scenarios` section. */
	readonly scenarios: JsonObject;
	/** Compiled `wiring` section. */
	readonly wiring: JsonObject;
	/** Compiled `access` section. */
	readonly access: JsonObject;
}

/**
 * Deterministic cross-section reference index emitted by canonical normalization.
 */
export interface CanonicalSpecModelReferenceIndex {
	/** Query ids from `queries`. */
	readonly queryIds: readonly string[];
	/** Mutation ids from `mutations`. */
	readonly mutationIds: readonly string[];
	/** Route ids from `routes`. */
	readonly routeIds: readonly string[];
	/** View screen ids from `views.screens`. */
	readonly screenIds: readonly string[];
	/** Domain action ids from `domain.actions`. */
	readonly actionIds: readonly string[];
	/** Domain projection ids from `domain.projections`. */
	readonly projectionIds: readonly string[];
	/** View node ids from `views.nodes`. */
	readonly viewNodeIds: readonly string[];
	/** Capability references keyed by `<id>@<version>`. */
	readonly capabilityRefs: readonly string[];
	/** Persona ids from `personas`. */
	readonly personaIds: readonly string[];
	/** Scenario ids from `scenarios`. */
	readonly scenarioIds: readonly string[];
}

/**
 * Canonical in-memory model produced before lane compilation.
 */
export interface CanonicalSpecModel {
	/** Normalized full-spec sections. */
	readonly sections: CompiledCanonicalSections;
	/** Deterministic reference index for semantic validation. */
	readonly references: CanonicalSpecModelReferenceIndex;
	/** Parsed query entrypoint declarations in author order. */
	readonly queries: readonly JsonObject[];
	/** Parsed mutation entrypoint declarations in author order. */
	readonly mutations: readonly JsonObject[];
	/** Parsed wiring section. */
	readonly wiring: JsonObject;
	/** Parsed views section. */
	readonly views: JsonObject;
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
	/** Canonical compiled full-spec section snapshots. */
	readonly sections: CompiledCanonicalSections;
	/** Entrypoint contracts keyed by `<kind>:<id>`. */
	readonly entrypoints: Readonly<Record<string, CompiledEntrypoint>>;
	/** Surface bindings keyed by `<surface>:<kind>:<id>`. */
	readonly bindings: Readonly<Record<string, CompiledSurfaceBinding>>;
	/** Surface dispatch plans keyed by surface id. */
	readonly dispatchPlans: CompiledSurfaceDispatchPlanSet;
	/** Reachability requirements keyed by `<portId>@<portVersion>`. */
	readonly reachabilityRequirements?: Readonly<
		Record<string, CompiledReachabilityRequirement>
	>;
	/** Deployment resolver input artifact for reachability requirements. */
	readonly bindingRequirementsArtifact: CompiledBindingRequirements;
	/** Manifest references for emitted lane artifacts. */
	readonly artifactManifest: CompiledArtifactManifest;
	/** Canonical lane artifacts directly consumable without bundle unpacking. */
	readonly laneArtifacts: CompiledLaneArtifacts;
	/** Refresh subscriptions keyed by query id. */
	readonly refreshSubscriptions: Readonly<
		Record<string, CompiledRefreshSubscription>
	>;
	/** Compiled access rules for policy gate enforcement. */
	readonly accessPlan: CompiledAccessPlan;
	/** Render IR consumed by render kernels. */
	readonly viewRenderIR: CompiledViewRenderIR;
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

/**
 * Version identifier for minimal compiled app-spec section snapshots.
 */
export const compiledAppSpecVersionSchema = z.literal("1.0.0");

/**
 * Minimal compiled section snapshot scaffold.
 */
export const compiledSectionSnapshotSchema = z.object({
	artifactVersion: compiledAppSpecVersionSchema,
	sections: z.record(z.string(), z.unknown()),
});

/**
 * Parsed compiled section snapshot.
 */
export type CompiledSectionSnapshot = z.infer<
	typeof compiledSectionSnapshotSchema
>;

/**
 * Parses and validates one compiled section snapshot payload.
 */
export const parseCompiledSectionSnapshot = (
	value: unknown,
): CompiledSectionSnapshot => compiledSectionSnapshotSchema.parse(value);
