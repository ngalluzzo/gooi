import { effectKindSchema } from "@gooi/capability-contracts/capability-port";
import { jsonValueSchema } from "@gooi/contract-primitives/json";
import { z } from "zod";

/**
 * Artifact version for capability index snapshots.
 */
export const capabilityIndexArtifactVersionSchema = z.literal("1.0.0");

/**
 * Capability source provenance.
 */
export const capabilityProvenanceSchema = z.enum(["local-spec", "catalog"]);

/**
 * Certification lifecycle state for a capability entry.
 */
export const capabilityCertificationStateSchema = z.enum([
	"uncertified",
	"pending",
	"certified",
	"rejected",
	"revoked",
]);

/**
 * Trust posture tier for capability resolution and diagnostics.
 */
export const capabilityTrustTierSchema = z.enum([
	"unknown",
	"community",
	"verified",
	"trusted",
]);

/**
 * One provider availability record for a capability.
 */
export const capabilityProviderAvailabilitySchema = z.object({
	providerId: z.string().min(1),
	providerVersion: z.string().min(1),
	status: z.enum(["available", "deprecated", "unavailable"]),
});

const capabilityDeprecationSchema = z.object({
	isDeprecated: z.boolean(),
	replacementCapabilityId: z.string().min(1).optional(),
	deprecatedAt: z.iso.datetime().optional(),
	removalAt: z.iso.datetime().optional(),
});

const capabilityIoSchemaRefsSchema = z.object({
	inputSchemaRef: z.string().min(1),
	outputSchemaRef: z.string().min(1),
	errorSchemaRef: z.string().min(1),
});

const capabilityExamplePayloadsSchema = z.object({
	input: jsonValueSchema.optional(),
	output: jsonValueSchema.optional(),
	error: jsonValueSchema.optional(),
});

/**
 * Canonical capability entry included in a capability index snapshot.
 */
export const capabilityIndexEntrySchema = z.object({
	capabilityId: z.string().min(1),
	capabilityVersion: z.string().min(1),
	declaredEffects: z.array(effectKindSchema),
	ioSchemaRefs: capabilityIoSchemaRefsSchema,
	deprecation: capabilityDeprecationSchema,
	examples: capabilityExamplePayloadsSchema,
	providerAvailability: z.array(capabilityProviderAvailabilitySchema),
	provenance: capabilityProvenanceSchema,
	certificationState: capabilityCertificationStateSchema,
	trustTier: capabilityTrustTierSchema,
	lastVerifiedAt: z.iso.datetime().nullable(),
});

const buildCapabilityIndexEntryInputSchema = capabilityIndexEntrySchema.omit({
	provenance: true,
});

const catalogIdentitySchema = z.object({
	catalogSource: z.string().min(1),
	catalogVersion: z.string().min(1),
	catalogHash: z.string().regex(/^[a-f0-9]{64}$/),
});

/**
 * Capability index snapshot artifact.
 */
export const capabilityIndexSnapshotSchema = z.object({
	artifactVersion: capabilityIndexArtifactVersionSchema,
	sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
	artifactHash: z.string().regex(/^[a-f0-9]{64}$/),
	catalogIdentity: catalogIdentitySchema,
	capabilities: z.array(capabilityIndexEntrySchema),
});

/**
 * Input payload for capability index snapshot creation.
 */
export const buildCapabilityIndexSnapshotInputSchema = z.object({
	sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
	catalogIdentity: catalogIdentitySchema,
	localCapabilities: z.array(buildCapabilityIndexEntryInputSchema),
	catalogCapabilities: z.array(buildCapabilityIndexEntryInputSchema),
});

/**
 * Parsed capability index entry.
 */
export type CapabilityIndexEntry = z.infer<typeof capabilityIndexEntrySchema>;

/**
 * Parsed capability index snapshot.
 */
export type CapabilityIndexSnapshot = z.infer<
	typeof capabilityIndexSnapshotSchema
>;

/**
 * Input payload for capability index snapshot creation.
 */
export type BuildCapabilityIndexSnapshotInput = z.infer<
	typeof buildCapabilityIndexSnapshotInputSchema
>;
