import { z } from "zod";

export const listingErrorCodeSchema = z.enum([
	"listing_schema_error",
	"listing_policy_error",
	"listing_conflict_error",
	"listing_not_found_error",
]);

export type ListingErrorCode = z.infer<typeof listingErrorCodeSchema>;

export const listingErrorIssueSchema = z.object({
	path: z.array(z.string()),
	message: z.string().min(1),
});

export type ListingErrorIssue = z.infer<typeof listingErrorIssueSchema>;

export const listingErrorSchema = z.object({
	code: listingErrorCodeSchema,
	message: z.string().min(1),
	issues: z.array(listingErrorIssueSchema).optional(),
});

export type ListingError = z.infer<typeof listingErrorSchema>;

export const createListingError = (
	code: ListingErrorCode,
	message: string,
	issues?: readonly { path: readonly PropertyKey[]; message: string }[],
): ListingError => ({
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
