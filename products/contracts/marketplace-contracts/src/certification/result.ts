import { z } from "zod";
import { certificationErrorSchema } from "./errors";
import {
	certificationAuditEventSchema,
	certificationRecordSchema,
	certificationRegistryStateSchema,
} from "./model";

export const certificationMutationSuccessSchema = z.object({
	ok: z.literal(true),
	state: certificationRegistryStateSchema,
	record: certificationRecordSchema,
	auditEvent: certificationAuditEventSchema.optional(),
});

export const certificationMutationFailureSchema = z.object({
	ok: z.literal(false),
	error: certificationErrorSchema,
});

export const certificationMutationResultSchema = z.discriminatedUnion("ok", [
	certificationMutationSuccessSchema,
	certificationMutationFailureSchema,
]);

export type CertificationMutationResult = z.infer<
	typeof certificationMutationResultSchema
>;
