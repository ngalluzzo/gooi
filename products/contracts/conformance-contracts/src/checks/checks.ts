import { z } from "zod";

/**
 * Shared base shape for one conformance check result.
 */
export interface ConformanceCheckResultBase<TCheckId extends string = string> {
	readonly id: TCheckId;
	readonly passed: boolean;
	readonly detail: string;
}

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
export type ConformanceCheckResult = ConformanceCheckResultBase;

/**
 * Parses one conformance check result payload.
 */
export const parseConformanceCheckResult = (
	value: unknown,
): ConformanceCheckResult => conformanceCheckResultSchema.parse(value);
