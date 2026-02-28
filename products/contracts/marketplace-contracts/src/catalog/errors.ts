import { z } from "zod";

export const catalogErrorCodeSchema = z.enum([
	"catalog_schema_error",
	"catalog_not_found_error",
]);

export type CatalogErrorCode = z.infer<typeof catalogErrorCodeSchema>;

export const catalogErrorIssueSchema = z.object({
	path: z.array(z.string()),
	message: z.string().min(1),
});

export type CatalogErrorIssue = z.infer<typeof catalogErrorIssueSchema>;

export const catalogErrorSchema = z.object({
	code: catalogErrorCodeSchema,
	message: z.string().min(1),
	issues: z.array(catalogErrorIssueSchema).optional(),
});

export type CatalogError = z.infer<typeof catalogErrorSchema>;

export const createCatalogError = (
	code: CatalogErrorCode,
	message: string,
	issues?: readonly { path: readonly PropertyKey[]; message: string }[],
): CatalogError => ({
	code,
	message,
	...(issues === undefined
		? {}
		: {
				issues: issues.map((issue) => ({
					path: issue.path.map((part) => String(part)),
					message: issue.message,
				})),
			}),
});
