import { z } from "zod";
import {
	listingLifecycleStatusSchema,
	listingRecordSchema,
	listingRegistryStateSchema,
} from "../listing/model";
import { hexHashSchema } from "../shared/hashes";
import { catalogErrorSchema } from "./errors";

export const catalogEntrySchema = listingRecordSchema;

export type CatalogEntry = z.infer<typeof catalogEntrySchema>;

export const catalogSearchQuerySchema = z.object({
	providerNamespace: z.string().min(1).optional(),
	providerIdPrefix: z.string().min(1).optional(),
	text: z.string().min(1).optional(),
	status: listingLifecycleStatusSchema.optional(),
	limit: z.number().int().positive().max(200).default(50),
	offset: z.number().int().nonnegative().default(0),
});

export type CatalogSearchQuery = z.input<typeof catalogSearchQuerySchema>;

export const catalogSearchInputSchema = z.object({
	state: listingRegistryStateSchema,
	query: catalogSearchQuerySchema.default({ limit: 50, offset: 0 }),
});

export type CatalogSearchInput = z.input<typeof catalogSearchInputSchema>;

export const catalogSearchViewSchema = z.object({
	query: catalogSearchQuerySchema,
	total: z.number().int().nonnegative(),
	items: z.array(catalogEntrySchema),
});

export type CatalogSearchView = z.infer<typeof catalogSearchViewSchema>;

export const catalogSearchResultSchema = z.discriminatedUnion("ok", [
	z.object({
		ok: z.literal(true),
		result: catalogSearchViewSchema,
	}),
	z.object({
		ok: z.literal(false),
		error: catalogErrorSchema,
	}),
]);

export type CatalogSearchResult = z.infer<typeof catalogSearchResultSchema>;

export const catalogDetailInputSchema = z.object({
	state: listingRegistryStateSchema,
	providerId: z.string().min(1),
	providerVersion: z.string().min(1),
});

export type CatalogDetailInput = z.input<typeof catalogDetailInputSchema>;

export const catalogDetailSuccessSchema = z.object({
	ok: z.literal(true),
	item: catalogEntrySchema,
});

export const catalogDetailFailureSchema = z.object({
	ok: z.literal(false),
	error: catalogErrorSchema,
});

export const catalogDetailResultSchema = z.discriminatedUnion("ok", [
	catalogDetailSuccessSchema,
	catalogDetailFailureSchema,
]);

export type CatalogDetailResult = z.infer<typeof catalogDetailResultSchema>;

export const catalogSnapshotExportInputSchema = z.object({
	state: listingRegistryStateSchema,
	mirrorId: z.string().min(1),
	exportVersion: z.literal("1.0.0").default("1.0.0"),
	includeDeprecated: z.boolean().default(true),
});

export type CatalogSnapshotExportInput = z.input<
	typeof catalogSnapshotExportInputSchema
>;

export const catalogSnapshotSchema = z.object({
	snapshotHash: hexHashSchema,
	snapshotId: z.string().min(1),
	mirrorId: z.string().min(1),
	mirrorPath: z.string().min(1),
	exportVersion: z.literal("1.0.0"),
	sourceAuditSequence: z.number().int().nonnegative(),
	listingCount: z.number().int().nonnegative(),
	listings: z.array(catalogEntrySchema),
});

export type CatalogSnapshot = z.infer<typeof catalogSnapshotSchema>;

export const catalogSnapshotResultSchema = z.discriminatedUnion("ok", [
	z.object({
		ok: z.literal(true),
		snapshot: catalogSnapshotSchema,
	}),
	z.object({
		ok: z.literal(false),
		error: catalogErrorSchema,
	}),
]);

export type CatalogSnapshotResult = z.infer<typeof catalogSnapshotResultSchema>;
