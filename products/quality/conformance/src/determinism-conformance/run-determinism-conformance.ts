import { reportsContracts } from "@gooi/conformance-contracts/reports";
import type {
	DeterminismConformanceDiagnostic,
	DeterminismConformanceReport,
	DeterminismRunCase,
	RunDeterminismConformanceInput,
} from "./contracts";

const buildCheck = (
	id: DeterminismConformanceReport["checks"][number]["id"],
	passed: boolean,
	detail: string,
): DeterminismConformanceReport["checks"][number] => ({
	id,
	passed,
	detail,
});

const repeatCase = async (
	runCase: DeterminismRunCase,
	iterations: number,
): Promise<string[]> => {
	const digests: string[] = [];
	for (let index = 0; index < iterations; index += 1) {
		const result = await runCase.run();
		digests.push(
			reportsContracts.serializeConformanceReportDeterministically(result),
		);
	}
	return digests;
};

const evaluateCaseGroup = async (input: {
	groupId: "artifact" | "envelope";
	cases: readonly DeterminismRunCase[];
	iterations: number;
	diagnostics: DeterminismConformanceDiagnostic[];
}): Promise<boolean> => {
	let passed = true;
	for (const runCase of input.cases) {
		const digests = await repeatCase(runCase, input.iterations);
		const expected = digests[0];
		const deterministic = digests.every((digest) => digest === expected);
		if (!deterministic) {
			passed = false;
			input.diagnostics.push({
				code: "conformance_determinism_error",
				message: `Repeated ${input.groupId} case '${runCase.id}' produced divergent outputs.`,
				path: `${input.groupId}.${runCase.id}`,
			});
		}
	}
	return passed;
};

/**
 * Runs deterministic artifact/envelope checks for repeated identical inputs.
 */
export const runDeterminismConformance = async (
	value: RunDeterminismConformanceInput,
): Promise<DeterminismConformanceReport> => {
	const diagnostics: DeterminismConformanceDiagnostic[] = [];
	const iterations = Math.max(value.iterations ?? 2, 2);

	const artifactsDeterministic = await evaluateCaseGroup({
		groupId: "artifact",
		cases: value.artifactCases,
		iterations,
		diagnostics,
	});
	const envelopesDeterministic = await evaluateCaseGroup({
		groupId: "envelope",
		cases: value.envelopeCases,
		iterations,
		diagnostics,
	});

	const checks: DeterminismConformanceReport["checks"] = [
		buildCheck(
			"artifact_outputs_deterministic",
			artifactsDeterministic,
			artifactsDeterministic
				? "Repeated artifact evaluations remained deterministic."
				: "One or more artifact evaluations diverged across repeated runs.",
		),
		buildCheck(
			"envelope_outputs_deterministic",
			envelopesDeterministic,
			envelopesDeterministic
				? "Repeated envelope evaluations remained deterministic."
				: "One or more envelope evaluations diverged across repeated runs.",
		),
	];

	return {
		passed: checks.every((check) => check.passed),
		checks,
		diagnostics,
	};
};
