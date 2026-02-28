/**
 * Canonical boundary contract API.
 */

import {
	type DiagnosticRecord,
	diagnosticRecordSchema as diagnosticRecordSchemaValue,
} from "../diagnostics/diagnostics";
import * as compiled from "./compiled";

export type {
	ArtifactVersion,
	CanonicalSpecModel,
	CanonicalSpecModelReferenceIndex,
	CompileDiagnostic,
	CompiledAccessPlan,
	CompiledArtifactManifest,
	CompiledArtifactManifestVersion,
	CompiledBindingRequirements,
	CompiledBindingRequirementsArtifactVersion,
	CompiledBindingRequirementsCompatibility,
	CompiledCanonicalSections,
	CompiledEntrypoint,
	CompiledEntrypointBundle,
	CompiledEntrypointKind,
	CompiledInputField,
	CompiledJsonSchemaArtifact,
	CompiledLaneArtifacts,
	CompiledReachabilityMode,
	CompiledReachabilityRequirement,
	CompiledRefreshSubscription,
	CompiledRoleDefinition,
	CompiledRoleDeriveRule,
	CompiledScalarType,
	CompiledSectionSnapshot,
	CompiledSurfaceBinding,
	CompileEntrypointBundleFailure,
	CompileEntrypointBundleResult,
	CompileEntrypointBundleSuccess,
	DiagnosticSeverity,
} from "./compiled";
export type { DiagnosticRecord };

export const diagnosticRecordSchema = diagnosticRecordSchemaValue;
export const diagnosticSeveritySchema = compiled.diagnosticSeveritySchema;

export const compiledContracts = Object.freeze({
	artifactVersionSchema: compiled.artifactVersionSchema,
	diagnosticRecordSchema,
	diagnosticSeveritySchema,
	compiledScalarTypeSchema: compiled.compiledScalarTypeSchema,
	compiledEntrypointKindSchema: compiled.compiledEntrypointKindSchema,
	compiledReachabilityModeSchema: compiled.compiledReachabilityModeSchema,
	compiledBindingRequirementsArtifactVersionSchema:
		compiled.compiledBindingRequirementsArtifactVersionSchema,
	compiledArtifactManifestVersionSchema:
		compiled.compiledArtifactManifestVersionSchema,
	compiledAppSpecVersionSchema: compiled.compiledAppSpecVersionSchema,
	compiledSectionSnapshotSchema: compiled.compiledSectionSnapshotSchema,
	parseCompiledSectionSnapshot: compiled.parseCompiledSectionSnapshot,
});
