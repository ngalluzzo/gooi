import { z } from "zod";

export const certificationErrorCodeSchema = z.enum([
	"certification_schema_error",
	"certification_not_found_error",
	"certification_policy_error",
	"certification_transition_error",
]);

export type CertificationErrorCode = z.infer<
	typeof certificationErrorCodeSchema
>;

export const certificationErrorIssueSchema = z.object({
	path: z.array(z.string()),
	message: z.string().min(1),
});

export type CertificationErrorIssue = z.infer<
	typeof certificationErrorIssueSchema
>;

export const certificationErrorSchema = z.object({
	code: certificationErrorCodeSchema,
	message: z.string().min(1),
	issues: z.array(certificationErrorIssueSchema).optional(),
});

export type CertificationError = z.infer<typeof certificationErrorSchema>;

export const createCertificationError = (
	code: CertificationErrorCode,
	message: string,
	issues?: readonly { path: readonly PropertyKey[]; message: string }[],
): CertificationError => ({
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
