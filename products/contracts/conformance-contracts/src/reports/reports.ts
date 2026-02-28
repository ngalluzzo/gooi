import { z } from "zod";
import {
	type ConformanceCheckResultBase,
	conformanceCheckResultSchema,
} from "../checks/checks";
import {
	type ConformanceFixtureDescriptor,
	conformanceFixtureDescriptorSchema,
} from "../fixtures/fixtures";
import {
	type ConformanceContractVersion,
	conformanceContractVersionSchema,
} from "../version/version";

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

/**
 * Versioned conformance suite report envelope.
 */
export interface VersionedConformanceSuiteReport<
	TCheckResult extends ConformanceCheckResultBase = ConformanceCheckResultBase,
	TVersion extends ConformanceContractVersion = ConformanceContractVersion,
> {
	readonly contractVersion: TVersion;
	readonly fixture: ConformanceFixtureDescriptor;
	readonly report: ConformanceSuiteReportBase<TCheckResult>;
}

/**
 * Canonical versioned conformance suite report.
 */
export const versionedConformanceSuiteReportSchema = z.object({
	contractVersion: conformanceContractVersionSchema,
	fixture: conformanceFixtureDescriptorSchema,
	report: conformanceSuiteReportSchema,
});

/**
 * Parsed versioned conformance suite report payload.
 */
export type ParsedVersionedConformanceSuiteReport =
	VersionedConformanceSuiteReport;

/**
 * Parses one versioned conformance suite report payload.
 */
export const parseVersionedConformanceSuiteReport = (
	value: unknown,
): ParsedVersionedConformanceSuiteReport =>
	versionedConformanceSuiteReportSchema.parse(value);

const sortJson = (value: unknown): unknown => {
	if (Array.isArray(value)) {
		return value.map((entry) => sortJson(entry));
	}
	if (value !== null && typeof value === "object") {
		const entries = Object.entries(value as Record<string, unknown>).sort(
			([left], [right]) => left.localeCompare(right),
		);
		const sorted: Record<string, unknown> = {};
		entries.forEach(([key, entry]) => {
			sorted[key] = sortJson(entry);
		});
		return sorted;
	}
	return value;
};

/**
 * Serializes a conformance report deterministically for cross-run comparison.
 */
export const serializeConformanceReportDeterministically = (
	value: unknown,
): string => JSON.stringify(sortJson(value));
