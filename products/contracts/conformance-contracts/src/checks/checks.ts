import { z } from "zod";
import {
	type ConformanceContractVersion,
	conformanceContractVersionSchema,
} from "../version/version";

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

/**
 * Versioned conformance check result envelope.
 */
export interface VersionedConformanceCheckResult<
	TCheckId extends string = string,
	TVersion extends ConformanceContractVersion = ConformanceContractVersion,
> {
	readonly contractVersion: TVersion;
	readonly check: ConformanceCheckResultBase<TCheckId>;
}

/**
 * Canonical versioned conformance check result.
 */
export const versionedConformanceCheckResultSchema = z.object({
	contractVersion: conformanceContractVersionSchema,
	check: conformanceCheckResultSchema,
});

/**
 * Parsed versioned conformance check result.
 */
export type ParsedVersionedConformanceCheckResult =
	VersionedConformanceCheckResult;

/**
 * Parses one versioned conformance check result payload.
 */
export const parseVersionedConformanceCheckResult = (
	value: unknown,
): ParsedVersionedConformanceCheckResult =>
	versionedConformanceCheckResultSchema.parse(value);
