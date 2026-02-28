import { listAuthoringCodeLenses } from "@gooi/language-server/features/actions/list";
import { resolveAuthoringCodeLens } from "@gooi/language-server/features/actions/resolve";
import { getAuthoringDefinition } from "@gooi/language-server/features/navigation/definition";
import { prepareAuthoringRename } from "@gooi/language-server/features/rename/prepare";
import { makeCheck } from "./check-helpers";
import type {
	AuthoringConformanceCheck,
	RunAuthoringConformanceInput,
} from "./contracts";

export const buildLensAndNavigationChecks = (
	input: RunAuthoringConformanceInput,
): AuthoringConformanceCheck[] => {
	const checks: AuthoringConformanceCheck[] = [];
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

	return checks;
};

export const buildSignalImpactChainChecks = (
	input: RunAuthoringConformanceInput,
): AuthoringConformanceCheck[] => {
	const unresolvedLenses = listAuthoringCodeLenses({ context: input.context });
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

	return [
		makeCheck({
			id: "signal_impact_chain",
			passed:
				Array.isArray(querySymbolIds?.querySymbolIds) &&
				querySymbolIds.querySymbolIds.includes("entrypoint:home.data.messages"),
			detail:
				"Signal impact chain resolves emits -> subscription -> affected query derivations.",
		}),
	];
};
