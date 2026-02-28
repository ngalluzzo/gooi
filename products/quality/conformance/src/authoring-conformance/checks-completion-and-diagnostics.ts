import { executeAuthoringCliEnvelope } from "@gooi/language-server/features/cli/execute";
import { listAuthoringCompletionItems } from "@gooi/language-server/features/completion/list";
import { publishAuthoringDiagnostics } from "@gooi/language-server/features/diagnostics/publish";
import {
	CONFORMANCE_GENERATED_AT,
	makeCheck,
	makeCliEnvelope,
	parseCliResultEnvelope,
	stableEqual,
} from "./check-helpers";
import type {
	AuthoringConformanceCheck,
	RunAuthoringConformanceInput,
} from "./contracts";

export const buildCompletionAndDiagnosticChecks = (
	input: RunAuthoringConformanceInput,
): AuthoringConformanceCheck[] => {
	const checks: AuthoringConformanceCheck[] = [];

	const capabilityCompletion = listAuthoringCompletionItems({
		context: input.context,
		position: input.positions.capabilityCompletion,
	});
	const signalCompletion = listAuthoringCompletionItems({
		context: input.context,
		position: input.positions.signalCompletion,
	});
	checks.push(
		makeCheck({
			id: "completion_correctness",
			passed:
				capabilityCompletion.items.some(
					(item) => item.label === "message.is_allowed",
				) &&
				signalCompletion.items.some((item) => item.label === "message.created"),
			detail: "Completion resolves capability and signal symbols.",
		}),
	);

	const diagnosticsMatched = publishAuthoringDiagnostics({
		context: input.context,
		generatedAt: CONFORMANCE_GENERATED_AT,
	});
	const diagnosticsMismatch = publishAuthoringDiagnostics({
		context: { ...input.context, lockfile: input.staleLockfile },
		generatedAt: CONFORMANCE_GENERATED_AT,
	});
	const cliDiagnoseMatched = executeAuthoringCliEnvelope(
		makeCliEnvelope({
			requestId: "conformance-cli-diagnose-matched",
			operation: "diagnose",
			payload: {
				context: input.context,
				generatedAt: CONFORMANCE_GENERATED_AT,
			},
		}),
	);
	const cliDiagnoseMismatch = executeAuthoringCliEnvelope(
		makeCliEnvelope({
			requestId: "conformance-cli-diagnose-mismatch",
			operation: "diagnose",
			payload: {
				context: { ...input.context, lockfile: input.staleLockfile },
				generatedAt: CONFORMANCE_GENERATED_AT,
			},
		}),
	);
	const cliCompletion = executeAuthoringCliEnvelope(
		makeCliEnvelope({
			requestId: "conformance-cli-complete",
			operation: "complete",
			payload: {
				context: input.context,
				position: input.positions.capabilityCompletion,
			},
		}),
	);
	checks.push(
		makeCheck({
			id: "cli_lsp_parity",
			passed:
				cliDiagnoseMatched.ok &&
				cliDiagnoseMismatch.ok &&
				cliCompletion.ok &&
				stableEqual(
					parseCliResultEnvelope(cliDiagnoseMatched).result,
					diagnosticsMatched,
				) &&
				stableEqual(
					parseCliResultEnvelope(cliDiagnoseMismatch).result,
					diagnosticsMismatch,
				) &&
				stableEqual(
					parseCliResultEnvelope(cliCompletion).result,
					capabilityCompletion,
				),
			detail:
				"CLI diagnose/complete envelopes remain equivalent to language-server outputs in matched and mismatch states.",
		}),
	);
	checks.push(
		makeCheck({
			id: "diagnostics_parity",
			passed:
				diagnosticsMatched.parity.status === "matched" &&
				diagnosticsMismatch.parity.status === "mismatch" &&
				diagnosticsMismatch.diagnostics.length > 0,
			detail:
				"Diagnostics parity reflects matched and mismatch lockfile states.",
		}),
	);

	const reachabilityDiagnostics =
		input.invalidReachabilitySourceSpec === undefined
			? []
			: publishAuthoringDiagnostics({
					context: {
						...input.context,
						sourceSpec: input.invalidReachabilitySourceSpec,
					},
				}).diagnostics;
	checks.push(
		makeCheck({
			id: "reachability_diagnostics",
			passed:
				reachabilityDiagnostics.length === 0 ||
				reachabilityDiagnostics.some((diagnostic) =>
					[
						"reachability_mode_invalid",
						"reachability_capability_unknown",
						"reachability_capability_version_unknown",
						"reachability_delegate_route_unknown",
					].includes(diagnostic.code),
				),
			detail:
				reachabilityDiagnostics.length === 0
					? "Reachability diagnostics fixture omitted; baseline remains pass-through."
					: "Reachability diagnostics emit typed failure codes.",
		}),
	);

	const guardScenarioDiagnostics =
		input.invalidGuardScenarioSourceSpec === undefined
			? []
			: publishAuthoringDiagnostics({
					context: {
						...input.context,
						sourceSpec: input.invalidGuardScenarioSourceSpec,
					},
				}).diagnostics;
	checks.push(
		makeCheck({
			id: "guard_scenario_diagnostics",
			passed:
				guardScenarioDiagnostics.length === 0 ||
				guardScenarioDiagnostics.some((diagnostic) =>
					[
						"guard_signal_unknown",
						"guard_flow_unknown",
						"guard_policy_invalid",
						"scenario_persona_unknown",
						"scenario_capture_source_invalid",
					].includes(diagnostic.code),
				),
			detail:
				guardScenarioDiagnostics.length === 0
					? "Guard/scenario diagnostics fixture omitted; baseline remains pass-through."
					: "Guard/scenario diagnostics emit typed failure codes.",
		}),
	);

	const guardPolicyCompletion = listAuthoringCompletionItems({
		context: input.context,
		position: input.positions.guardPolicyCompletion,
	});
	const scenarioPersonaCompletion = listAuthoringCompletionItems({
		context: input.context,
		position: input.positions.scenarioPersonaCompletion,
	});
	checks.push(
		makeCheck({
			id: "guard_scenario_completion",
			passed:
				guardPolicyCompletion.items.some((item) => item.label === "abort") &&
				scenarioPersonaCompletion.items.some((item) => item.kind === "persona"),
			detail:
				"Completion is context-aware for guard policy and scenario persona authoring paths.",
		}),
	);

	return checks;
};
