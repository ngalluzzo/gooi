import { z } from "zod";
import {
	type ConformanceCheckResultBase,
	conformanceCheckResultSchema,
} from "../checks/checks";

/**
 * Shared base shape for one conformance suite report.
 */
export interface ConformanceSuiteReportBase<
	TCheckResult extends ConformanceCheckResultBase = ConformanceCheckResultBase,
> {
	readonly passed: boolean;
	readonly checks: readonly TCheckResult[];
}

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
export type ConformanceSuiteReport = ConformanceSuiteReportBase;

/**
 * Parses one conformance suite report payload.
 */
export const parseConformanceSuiteReport = (
	value: unknown,
): ConformanceSuiteReport => conformanceSuiteReportSchema.parse(value);
