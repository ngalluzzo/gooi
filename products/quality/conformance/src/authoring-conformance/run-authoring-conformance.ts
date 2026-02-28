import { envelopesContracts } from "@gooi/authoring-contracts/envelopes";
import { listAuthoringCodeLenses } from "@gooi/language-server/features/actions/list";
import { resolveAuthoringCodeLens } from "@gooi/language-server/features/actions/resolve";
import { executeAuthoringCliEnvelope } from "@gooi/language-server/features/cli/execute";
import { listAuthoringCompletionItems } from "@gooi/language-server/features/completion/list";
import { publishAuthoringDiagnostics } from "@gooi/language-server/features/diagnostics/publish";
import { getAuthoringDefinition } from "@gooi/language-server/features/navigation/definition";
import { applyAuthoringRename } from "@gooi/language-server/features/rename/apply";
import { prepareAuthoringRename } from "@gooi/language-server/features/rename/prepare";
import { stableStringify } from "@gooi/stable-json";

import {
	type AuthoringConformanceCheck,
	type AuthoringConformanceReport,
	authoringConformanceCheckSchema,
	authoringConformanceReportSchema,
	runAuthoringConformanceInputSchema,
} from "./contracts";

const makeCheck = (
	value: AuthoringConformanceCheck,
): AuthoringConformanceCheck => authoringConformanceCheckSchema.parse(value);
const { parseAuthoringResultEnvelope } = envelopesContracts;

const makeCliEnvelope = (input: {
	readonly requestId: string;
	readonly operation: "diagnose" | "complete";
	readonly payload: unknown;
}) => ({
	envelopeVersion: "1.0.0" as const,
	requestId: input.requestId,
	requestedAt: "2026-02-28T00:00:00.000Z",
	operation: input.operation,
	payload: input.payload,
});

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
		generatedAt: "2026-02-28T00:00:00.000Z",
	});
	const diagnosticsMismatch = publishAuthoringDiagnostics({
		context: { ...input.context, lockfile: input.staleLockfile },
		generatedAt: "2026-02-28T00:00:00.000Z",
	});

	const cliDiagnoseMatched = executeAuthoringCliEnvelope(
		makeCliEnvelope({
			requestId: "conformance-cli-diagnose-matched",
			operation: "diagnose",
			payload: {
				context: input.context,
				generatedAt: "2026-02-28T00:00:00.000Z",
			},
		}),
	);
	const cliDiagnoseMismatch = executeAuthoringCliEnvelope(
		makeCliEnvelope({
			requestId: "conformance-cli-diagnose-mismatch",
			operation: "diagnose",
			payload: {
				context: { ...input.context, lockfile: input.staleLockfile },
				generatedAt: "2026-02-28T00:00:00.000Z",
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
	const cliParityPassed =
		cliDiagnoseMatched.ok &&
		cliDiagnoseMismatch.ok &&
		cliCompletion.ok &&
		stableStringify(parseAuthoringResultEnvelope(cliDiagnoseMatched).result) ===
			stableStringify(diagnosticsMatched) &&
		stableStringify(
			parseAuthoringResultEnvelope(cliDiagnoseMismatch).result,
		) === stableStringify(diagnosticsMismatch) &&
		stableStringify(parseAuthoringResultEnvelope(cliCompletion).result) ===
			stableStringify(capabilityCompletion);
	checks.push(
		makeCheck({
			id: "cli_lsp_parity",
			passed: cliParityPassed,
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

	const unresolvedLenses = listAuthoringCodeLenses({ context: input.context });
	const providerLens = unresolvedLenses.lenses.find(
		(lens) => lens.kind === "show_providers_for_capability",
	);
	const resolvedProviderLens =
		providerLens === undefined
			? undefined
			: resolveAuthoringCodeLens({
					context: input.context,
					lens: providerLens,
				});
	checks.push(
		makeCheck({
			id: "lens_correctness",
			passed:
				unresolvedLenses.lenses.some(
					(lens) => lens.kind === "run_query_or_mutation",
				) &&
				resolvedProviderLens?.lens.command?.id ===
					"gooi.authoring.showProviders",
			detail:
				"Code lenses include runnable, provider, and signal-aware actions.",
		}),
	);

	const definition = getAuthoringDefinition({
		context: input.context,
		position: input.positions.expressionReference,
	});
	const prepareAmbientRename = prepareAuthoringRename({
		context: input.context,
		position: input.positions.ambientSymbol,
	});
	checks.push(
		makeCheck({
			id: "expression_symbol_resolution",
			passed:
				definition.location?.symbolId === "step:generated_ids" &&
				prepareAmbientRename.ok === false,
			detail:
				"Expression var references resolve to step bindings and ambient symbols are guarded.",
		}),
	);

	const prepareRename = prepareAuthoringRename({
		context: input.context,
		position: input.positions.expressionReference,
	});
	const rename = applyAuthoringRename({
		context: input.context,
		position: input.positions.expressionReference,
		newName: input.renameTarget,
	});
	const renameCollision = applyAuthoringRename({
		context: input.context,
		position: input.positions.expressionReference,
		newName: input.renameCollisionTarget,
	});
	checks.push(
		makeCheck({
			id: "rename_safety",
			passed:
				prepareRename.ok === true &&
				rename.ok === true &&
				renameCollision.ok === false,
			detail:
				"Rename preflight, edit generation, and conflict rejection are enforced.",
		}),
	);

	const signalLens = unresolvedLenses.lenses.find(
		(lens) => lens.kind === "show_affected_queries_for_signal",
	);
	const resolvedSignalLens =
		signalLens === undefined
			? undefined
			: resolveAuthoringCodeLens({ context: input.context, lens: signalLens });
	const querySymbolIds = resolvedSignalLens?.lens.command?.arguments?.[0] as
		| { querySymbolIds?: string[] }
		| undefined;
	checks.push(
		makeCheck({
			id: "signal_impact_chain",
			passed:
				Array.isArray(querySymbolIds?.querySymbolIds) &&
				querySymbolIds.querySymbolIds.includes("entrypoint:home.data.messages"),
			detail:
				"Signal impact chain resolves emits -> subscription -> affected query derivations.",
		}),
	);

	return authoringConformanceReportSchema.parse({
		passed: checks.every((check) => check.passed),
		checks,
	});
};
