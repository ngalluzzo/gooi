import { z } from "zod";
import { trustErrorSchema } from "./errors";
import { trustDecisionReportSchema } from "./model";

export const verifyReleaseTrustSuccessSchema = z.object({
	ok: z.literal(true),
	report: trustDecisionReportSchema,
});

export const verifyReleaseTrustFailureSchema = z.object({
	ok: z.literal(false),
	error: trustErrorSchema,
});

export const verifyReleaseTrustResultSchema = z.discriminatedUnion("ok", [
	verifyReleaseTrustSuccessSchema,
	verifyReleaseTrustFailureSchema,
]);

export type VerifyReleaseTrustResult = z.infer<
	typeof verifyReleaseTrustResultSchema
>;
