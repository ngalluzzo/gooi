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
	CompiledDomainActionGuardPlan,
	CompiledDomainActionPlan,
	CompiledDomainActionStepInputPlan,
	CompiledDomainActionStepPlan,
	CompiledDomainCapabilityInputContract,
	CompiledDomainFlowGuardPlan,
	CompiledDomainFlowPlan,
	CompiledDomainMutationPlan,
	CompiledDomainQueryPlan,
	CompiledDomainRuntimeIR,
	CompiledDomainSessionOutcomePolicy,
	CompiledDomainSignalGuardPlan,
	CompiledDomainValueSource,
	CompiledEntrypoint,
	CompiledEntrypointBundle,
	CompiledEntrypointKind,
	CompiledInputField,
	CompiledJsonSchemaArtifact,
	CompiledLaneArtifacts,
	CompiledProjectionIR,
	CompiledReachabilityMode,
	CompiledReachabilityRequirement,
	CompiledRefreshSubscription,
	CompiledRoleDefinition,
	CompiledRoleDeriveRule,
	CompiledScalarType,
	CompiledScenarioPlanSet,
	CompiledSectionSnapshot,
	CompiledSessionFieldPlan,
	CompiledSessionIR,
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
	compiledDomainRuntimeIRVersion: compiled.compiledDomainRuntimeIRVersion,
	compiledSessionIRVersion: compiled.compiledSessionIRVersion,
	compiledAppSpecVersionSchema: compiled.compiledAppSpecVersionSchema,
	compiledSectionSnapshotSchema: compiled.compiledSectionSnapshotSchema,
	parseCompiledSectionSnapshot: compiled.parseCompiledSectionSnapshot,
});
