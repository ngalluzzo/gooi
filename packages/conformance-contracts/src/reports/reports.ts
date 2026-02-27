import { z } from "zod";
import { conformanceCheckResultSchema } from "../checks/checks";

/**
 * Canonical conformance suite report.
 */
export const conformanceSuiteReportSchema = z.object({
	passed: z.boolean(),
	checks: z.array(conformanceCheckResultSchema),
});

/**
 * Parsed conformance suite report.
 */
export type ConformanceSuiteReport = z.infer<
	typeof conformanceSuiteReportSchema
>;

/**
 * Parses one conformance suite report payload.
 */
export const parseConformanceSuiteReport = (
	value: unknown,
): ConformanceSuiteReport => conformanceSuiteReportSchema.parse(value);
