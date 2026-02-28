import type {
	RunTieredConformanceInput,
	TieredConformanceCheckResult,
	TieredConformanceReport,
	TieredConformanceSuiteExecutionResult,
} from "./contracts";
import { tieredConformanceStrategyVersion } from "./contracts";

const buildCheck = (
	id: TieredConformanceCheckResult["id"],
	passed: boolean,
	detail: string,
): TieredConformanceCheckResult => ({ id, passed, detail });

const maxBy = (
	values: readonly TieredConformanceSuiteExecutionResult[],
	selector: (value: TieredConformanceSuiteExecutionResult) => number,
): number => (values.length === 0 ? 0 : Math.max(...values.map(selector)));

/**
 * Runs one tier definition and enforces required suite, runtime, and flaky-rate thresholds.
 */
export const runTieredConformance = async (
	input: RunTieredConformanceInput,
): Promise<TieredConformanceReport> => {
	const suiteResults: TieredConformanceSuiteExecutionResult[] = [];
	for (const suite of input.definition.suites) {
		const result = await input.executeSuite(suite);
		suiteResults.push(result);
	}

	const definitionComplete =
		suiteResults.length === input.definition.suites.length;
	const requiredSuitesPass = input.definition.suites.every((suite) => {
		if (!suite.required) {
			return true;
		}
		const result = suiteResults.find(
			(entry) => entry.suiteId === suite.suiteId,
		);
		return result?.passed === true;
	});
	const runtimeThresholdsPass = input.definition.suites.every((suite) => {
		const result = suiteResults.find(
			(entry) => entry.suiteId === suite.suiteId,
		);
		return result !== undefined && result.runtimeMs <= suite.maxRuntimeMs;
	});
	const flakyRateThresholdsPass = input.definition.suites.every((suite) => {
		const result = suiteResults.find(
			(entry) => entry.suiteId === suite.suiteId,
		);
		return result !== undefined && result.flakyRate <= suite.maxFlakyRate;
	});

	const checks: TieredConformanceCheckResult[] = [
		buildCheck(
			"tier_definition_complete",
			definitionComplete,
			definitionComplete
				? "Executed all suites declared by tier definition."
				: "Executed suite count does not match tier definition.",
		),
		buildCheck(
			"required_suites_pass",
			requiredSuitesPass,
			requiredSuitesPass
				? "All required suites passed."
				: "One or more required suites failed.",
		),
		buildCheck(
			"runtime_thresholds_enforced",
			runtimeThresholdsPass,
			runtimeThresholdsPass
				? "All suite runtimes stayed within configured thresholds."
				: `Runtime threshold exceeded (max observed ${Math.floor(maxBy(suiteResults, (result) => result.runtimeMs))}ms).`,
		),
		buildCheck(
			"flaky_rate_thresholds_enforced",
			flakyRateThresholdsPass,
			flakyRateThresholdsPass
				? "All suites stayed within flaky-rate thresholds."
				: `Flaky-rate threshold exceeded (max observed ${maxBy(suiteResults, (result) => result.flakyRate).toFixed(2)}).`,
		),
	];

	return {
		passed: checks.every((check) => check.passed),
		checks,
		tierId: input.definition.tierId,
		gateRole: input.definition.gateRole,
		version: tieredConformanceStrategyVersion,
		suites: suiteResults,
	};
};
