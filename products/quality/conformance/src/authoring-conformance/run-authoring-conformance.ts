import { listAuthoringCodeLenses } from "@gooi/product-authoring-lsp/features/actions/list";
import { resolveAuthoringCodeLens } from "@gooi/product-authoring-lsp/features/actions/resolve";
import { listAuthoringCompletionItems } from "@gooi/product-authoring-lsp/features/completion/list";
import { publishAuthoringDiagnostics } from "@gooi/product-authoring-lsp/features/diagnostics/publish";
import { getAuthoringDefinition } from "@gooi/product-authoring-lsp/features/navigation/definition";
import { applyAuthoringRename } from "@gooi/product-authoring-lsp/features/rename/apply";
import { prepareAuthoringRename } from "@gooi/product-authoring-lsp/features/rename/prepare";

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
			message: "Completion resolves capability and signal symbols.",
		}),
	);

	const diagnosticsMatched = publishAuthoringDiagnostics({
		context: input.context,
	});
	const diagnosticsMismatch = publishAuthoringDiagnostics({
		context: { ...input.context, lockfile: input.staleLockfile },
	});
	checks.push(
		makeCheck({
			id: "diagnostics_parity",
			passed:
				diagnosticsMatched.parity.status === "matched" &&
				diagnosticsMismatch.parity.status === "mismatch" &&
				diagnosticsMismatch.diagnostics.length > 0,
			message:
				"Diagnostics parity reflects matched and mismatch lockfile states.",
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
			message:
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
			message:
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
			message:
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
			message:
				"Signal impact chain resolves emits -> subscription -> affected query derivations.",
		}),
	);

	return authoringConformanceReportSchema.parse({
		passed: checks.every((check) => check.passed),
		checks,
	});
};
