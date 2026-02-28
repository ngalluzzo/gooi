import { buildCompletionAndDiagnosticChecks } from "./checks-completion-and-diagnostics";
import {
	buildLensAndNavigationChecks,
	buildSignalImpactChainChecks,
} from "./checks-lenses-and-navigation";
import { buildRenameChecks } from "./checks-rename";
import type { AuthoringConformanceReport } from "./contracts";
import {
	authoringConformanceReportSchema,
	runAuthoringConformanceInputSchema,
} from "./contracts";

/**
 * Runs the RFC-0003 authoring conformance check suite.
 *
 * @param value - Untrusted authoring conformance input.
 * @returns Authoring conformance report.
 *
 * @example
 * const report = runAuthoringConformance(input);
 */
export const runAuthoringConformance = (
	value: unknown,
): AuthoringConformanceReport => {
	const input = runAuthoringConformanceInputSchema.parse(value);
	const checks = [
		...buildCompletionAndDiagnosticChecks(input),
		...buildLensAndNavigationChecks(input),
		...buildRenameChecks(input),
		...buildSignalImpactChainChecks(input),
	];

	return authoringConformanceReportSchema.parse({
		passed: checks.every((check) => check.passed),
		checks,
	});
};
