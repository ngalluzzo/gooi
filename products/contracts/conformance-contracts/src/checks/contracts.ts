/**
 * Canonical boundary contract API.
 */
import * as checks from "./checks";

export type {
	ConformanceCheckResult,
	ConformanceCheckResultBase,
} from "./checks";

export const checksContracts = Object.freeze({
	conformanceCheckResultSchema: checks.conformanceCheckResultSchema,
	parseConformanceCheckResult: checks.parseConformanceCheckResult,
});
