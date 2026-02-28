import { z } from "zod";
import { listingErrorSchema } from "./errors";
import {
	listingAuditEventSchema,
	listingRecordSchema,
	listingRegistryStateSchema,
} from "./model";

export const listingMutationSuccessSchema = z.object({
	ok: z.literal(true),
	state: listingRegistryStateSchema,
	listing: listingRecordSchema,
	auditEvent: listingAuditEventSchema.optional(),
});

export const listingMutationFailureSchema = z.object({
	ok: z.literal(false),
	error: listingErrorSchema,
});

export const listingMutationResultSchema = z.discriminatedUnion("ok", [
	listingMutationSuccessSchema,
	listingMutationFailureSchema,
]);

export type ListingMutationResult = z.infer<typeof listingMutationResultSchema>;
