/**
 * Canonical boundary contract API.
 */
import {
	boundarySchemaTargetSchema,
	buildSchemaArtifact,
	defineCapabilityPort,
	effectKindSchema,
	hostProviderSchemaProfile,
	hostProviderSchemaProfileSchema,
} from "./capability-port";

export type {
	BoundarySchemaTarget,
	CapabilityArtifacts,
	CapabilityPortContract,
	DefineCapabilityPortInput,
	EffectKind,
	HostProviderSchemaProfile,
	JsonSchema,
	SchemaArtifact,
} from "./capability-port";

export const capabilityPortContracts = Object.freeze({
	effectKindSchema: effectKindSchema,
	boundarySchemaTargetSchema: boundarySchemaTargetSchema,
	hostProviderSchemaProfileSchema: hostProviderSchemaProfileSchema,
	hostProviderSchemaProfile: hostProviderSchemaProfile,
	buildSchemaArtifact: buildSchemaArtifact,
	defineCapabilityPort: defineCapabilityPort,
});

export {
	effectKindSchema,
	boundarySchemaTargetSchema,
	hostProviderSchemaProfileSchema,
	hostProviderSchemaProfile,
	buildSchemaArtifact,
	defineCapabilityPort,
};
