import type {
	GuardConformanceReport,
	RunGuardConformanceInput,
} from "./contracts";

const buildCheck = (
	id: GuardConformanceReport["checks"][number]["id"],
	passed: boolean,
	detail: string,
): GuardConformanceReport["checks"][number] => ({ id, passed, detail });

/**
 * Runs guard-runtime conformance checks for layered enforcement and semantic policy behavior.
 */
export const runGuardConformance = async (
	input: RunGuardConformanceInput,
): Promise<GuardConformanceReport> => {
	const checks: Array<GuardConformanceReport["checks"][number]> = [];

	const invariant = input.evaluateInvariant({
		definition: input.collectionInvariant,
		context: { message: null },
	});
	const action = await input.evaluateGuard({
		definition: input.actionGuard,
		context: { input: { message: "hello" } },
		environment: "simulation",
		semanticJudge: {
			evaluate: async () => ({ pass: true }),
		},
	});
	const signal = await input.evaluateGuard({
		definition: input.signalGuard,
		context: { payload: { reason: "" } },
		environment: "simulation",
	});
	const flow = await input.evaluateGuard({
		definition: input.flowGuard,
		context: { steps: { notify: { ok: false } } },
		environment: "simulation",
	});
	const projection = await input.evaluateGuard({
		definition: input.projectionGuard,
		context: { row: { user_id: null } },
		environment: "simulation",
	});

	checks.push(
		buildCheck(
			"layered_matrix_enforced",
			!invariant.ok && action.ok && signal.ok && flow.ok && projection.ok,
			!invariant.ok && action.ok && signal.ok && flow.ok && projection.ok
				? "Collection/action/signal/flow/projection guard boundaries enforce as declared."
				: "Expected layered primitive enforcement outcomes were not observed.",
		),
	);

	const structuralFailure = await input.evaluateGuard({
		definition: input.actionGuard,
		context: { input: { message: "" } },
		environment: "ci",
		semanticJudge: {
			evaluate: async () => ({ pass: false }),
		},
	});
	checks.push(
		buildCheck(
			"structural_before_semantic",
			structuralFailure.meta.semanticEvaluated === 0,
			structuralFailure.meta.semanticEvaluated === 0
				? "Semantic tier is skipped when structural tier fails."
				: "Semantic tier evaluated despite structural failure.",
		),
	);

	checks.push(
		buildCheck(
			"violation_policy_outcomes_typed",
			signal.emittedSignals[0]?.signalId === "guard.violated" &&
				flow.policyOutcome.applied === "log_and_continue",
			signal.emittedSignals[0]?.signalId === "guard.violated" &&
				flow.policyOutcome.applied === "log_and_continue"
				? "Guard violations emit typed signals/diagnostics per policy contract."
				: "Policy outcomes did not match typed guard policy semantics.",
		),
	);

	let highInvocationCount = 0;
	const semanticCi = await input.evaluateGuard({
		definition: input.actionGuard,
		context: { input: { message: "hello" } },
		environment: "ci",
		semanticJudge: {
			evaluate: async () => {
				highInvocationCount += 1;
				return { pass: true };
			},
		},
	});
	checks.push(
		buildCheck(
			"semantic_sampling_confidence_ci",
			highInvocationCount === 3 && semanticCi.meta.semanticEvaluated === 1,
			highInvocationCount === 3 && semanticCi.meta.semanticEvaluated === 1
				? "High-confidence semantic guards in CI use deterministic 3-vote behavior."
				: "CI confidence behavior deviated from semantic judge invocation contract.",
		),
	);

	const noJudgeCi = await input.evaluateGuard({
		definition: input.actionGuard,
		context: { input: { message: "hello" } },
		environment: "ci",
	});
	const noJudgeProd = await input.evaluateGuard({
		definition: input.actionGuard,
		context: { input: { message: "hello" } },
		environment: "production",
	});
	checks.push(
		buildCheck(
			"missing_judge_degrades_per_contract",
			!noJudgeCi.ok && noJudgeProd.ok,
			!noJudgeCi.ok && noJudgeProd.ok
				? "Missing semantic judge fails in CI and degrades to warning in production."
				: "Semantic judge unavailability behavior does not match environment policy.",
		),
	);

	return {
		passed: checks.every((check) => check.passed),
		checks,
	};
};
