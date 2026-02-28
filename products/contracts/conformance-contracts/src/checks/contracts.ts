/**
 * Canonical boundary contract API.
 */
import * as checks from "./checks";

export type {
	ConformanceCheckResult,
	ConformanceCheckResultBase,
	ParsedVersionedConformanceCheckResult,
	VersionedConformanceCheckResult,
} from "./checks";

export const checksContracts = Object.freeze({
	conformanceCheckResultSchema: checks.conformanceCheckResultSchema,
	parseConformanceCheckResult: checks.parseConformanceCheckResult,
	versionedConformanceCheckResultSchema:
		checks.versionedConformanceCheckResultSchema,
	parseVersionedConformanceCheckResult:
		checks.parseVersionedConformanceCheckResult,
});
