import { z } from "zod";

/**
 * Canonical conformance check result.
 */
export const conformanceCheckResultSchema = z.object({
	id: z.string().min(1),
	passed: z.boolean(),
	detail: z.string().min(1),
});

/**
 * Parsed conformance check result.
 */
export type ConformanceCheckResult = z.infer<
	typeof conformanceCheckResultSchema
>;

/**
 * Parses one conformance check result payload.
 */
export const parseConformanceCheckResult = (
	value: unknown,
): ConformanceCheckResult => conformanceCheckResultSchema.parse(value);
