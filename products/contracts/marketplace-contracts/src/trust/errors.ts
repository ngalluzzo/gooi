import { z } from "zod";

export const trustErrorCodeSchema = z.enum([
	"trust_request_schema_error",
	"trust_identity_error",
	"trust_signature_invalid_error",
	"trust_provenance_invalid_error",
	"trust_policy_violation_error",
	"trust_certification_missing_error",
	"trust_revoked_error",
]);

export type TrustErrorCode = z.infer<typeof trustErrorCodeSchema>;

export const trustErrorIssueSchema = z.object({
	path: z.array(z.string()),
	message: z.string().min(1),
});

export type TrustErrorIssue = z.infer<typeof trustErrorIssueSchema>;

export const trustErrorSchema = z.object({
	code: trustErrorCodeSchema,
	message: z.string().min(1),
	issues: z.array(trustErrorIssueSchema).optional(),
});

export type TrustError = z.infer<typeof trustErrorSchema>;

export const createTrustError = (
	code: TrustErrorCode,
	message: string,
	issues?: readonly { path: readonly PropertyKey[]; message: string }[],
): TrustError => ({
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
