import { diagnosticRecordSchema } from "@gooi/app-spec-contracts/diagnostics";
import { z } from "zod";

const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);

/**
 * Lockfile parity issue code used during read-path degraded mode.
 */
export const authoringParityIssueCodeSchema = z.enum([
	"catalog_mismatch_error",
	"artifact_mismatch_error",
]);

/**
 * One read-path parity issue that surfaces stale artifacts.
 */
export const authoringParityIssueSchema = z.object({
	code: authoringParityIssueCodeSchema,
	...diagnosticRecordSchema.pick({ message: true, path: true }).shape,
	staleArtifacts: z.literal(true),
});

/**
 * Lockfile parity state for read-path operations.
 */
export const authoringParityStateSchema = z.object({
	status: z.enum(["matched", "mismatch"]),
	lockfileHash: hashSchema,
	issues: z.array(authoringParityIssueSchema),
});

/**
 * Parsed lockfile parity state.
 */
export type AuthoringParityState = z.infer<typeof authoringParityStateSchema>;
