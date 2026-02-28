import { z } from "zod";
import { lockedCapabilitySchema } from "../lockfile/contracts";
import { hexHashSchema, providerIntegritySchema } from "../shared/hashes";
import { semverSchema } from "../shared/semver";

export const listingLifecycleStatusSchema = z.enum(["active", "deprecated"]);

export type ListingLifecycleStatus = z.infer<
	typeof listingLifecycleStatusSchema
>;

export const listingMetadataSchema = z.object({
	displayName: z.string().min(1),
	summary: z.string().min(1).optional(),
	homepageUrl: z.url().optional(),
	tags: z.array(z.string().min(1)).default([]),
});

export type ListingMetadata = z.infer<typeof listingMetadataSchema>;

export const listingReleaseSchema = z.object({
	providerNamespace: z.string().min(1),
	providerId: z.string().min(1),
	providerVersion: semverSchema,
	contentHash: hexHashSchema,
	integrity: providerIntegritySchema,
	capabilities: z.array(lockedCapabilitySchema).min(1),
	metadata: listingMetadataSchema,
});

export type ListingRelease = z.infer<typeof listingReleaseSchema>;

export const listingRecordSchema = listingReleaseSchema.extend({
	status: listingLifecycleStatusSchema,
	publishedAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true }),
	deprecatedAt: z.string().datetime({ offset: true }).optional(),
});

export type ListingRecord = z.infer<typeof listingRecordSchema>;

export const listingAuditActionSchema = z.enum([
	"publish",
	"update",
	"deprecate",
]);

export type ListingAuditAction = z.infer<typeof listingAuditActionSchema>;

export const listingAuditEventSchema = z.object({
	sequence: z.number().int().positive(),
	occurredAt: z.string().datetime({ offset: true }),
	actorId: z.string().min(1),
	action: listingAuditActionSchema,
	providerNamespace: z.string().min(1),
	providerId: z.string().min(1),
	providerVersion: semverSchema,
	reason: z.string().min(1).optional(),
});

export type ListingAuditEvent = z.infer<typeof listingAuditEventSchema>;

export const listingRegistryStateSchema = z.object({
	listings: z.array(listingRecordSchema).default([]),
	auditLog: z.array(listingAuditEventSchema).default([]),
});

export type ListingRegistryState = z.infer<typeof listingRegistryStateSchema>;

export const publishListingInputSchema = z.object({
	state: listingRegistryStateSchema,
	actorId: z.string().min(1),
	occurredAt: z.string().datetime({ offset: true }),
	namespaceApprovals: z.array(z.string().min(1)).default([]),
	release: listingReleaseSchema,
});

export type PublishListingInput = z.input<typeof publishListingInputSchema>;

export const updateListingInputSchema = z.object({
	state: listingRegistryStateSchema,
	actorId: z.string().min(1),
	occurredAt: z.string().datetime({ offset: true }),
	providerId: z.string().min(1),
	providerVersion: semverSchema,
	metadata: listingMetadataSchema,
});

export type UpdateListingInput = z.input<typeof updateListingInputSchema>;

export const deprecateListingInputSchema = z.object({
	state: listingRegistryStateSchema,
	actorId: z.string().min(1),
	occurredAt: z.string().datetime({ offset: true }),
	providerId: z.string().min(1),
	providerVersion: semverSchema,
	reason: z.string().min(1),
});

export type DeprecateListingInput = z.input<typeof deprecateListingInputSchema>;
