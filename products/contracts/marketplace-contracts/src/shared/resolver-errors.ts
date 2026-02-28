import { z } from "zod";

export const resolverErrorCodeSchema = z.enum([
	"resolver_request_schema_error",
	"resolver_snapshot_not_found_error",
	"resolver_policy_rejection_error",
	"resolver_no_candidate_error",
	"resolver_delegation_unavailable_error",
	"resolver_scoring_profile_error",
]);

export type ResolverErrorCode = z.infer<typeof resolverErrorCodeSchema>;

export const resolverErrorIssueSchema = z.object({
	path: z.array(z.string()),
	message: z.string().min(1),
});

export type ResolverErrorIssue = z.infer<typeof resolverErrorIssueSchema>;

export const resolverErrorSchema = z.object({
	code: resolverErrorCodeSchema,
	message: z.string().min(1),
	issues: z.array(resolverErrorIssueSchema).optional(),
});

export type ResolverError = z.infer<typeof resolverErrorSchema>;

export const createResolverError = (
	code: ResolverErrorCode,
	message: string,
	issues?: readonly { path: readonly PropertyKey[]; message: string }[],
): ResolverError => ({
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
