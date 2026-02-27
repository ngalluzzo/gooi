import type { AuthoringEntrypointSpec } from "@gooi/app-spec-contracts/spec";
import type {
	CompileDiagnostic,
	CompiledEntrypoint,
	CompiledRefreshSubscription,
} from "./compile.contracts";

interface CompileRefreshSubscriptionsOutput {
	readonly subscriptions: Readonly<Record<string, CompiledRefreshSubscription>>;
	readonly diagnostics: readonly CompileDiagnostic[];
}

const queryKey = (queryId: string): string => `query:${queryId}`;

/**
 * Compiles query refresh subscriptions from view `refresh_on_signals` declarations.
 *
 * @param spec - Parsed authoring spec.
 * @param entrypoints - Compiled entrypoint contracts.
 * @returns Compiled refresh subscriptions and diagnostics.
 *
 * @example
 * const output = compileRefreshSubscriptions(spec, entrypoints);
 */
export const compileRefreshSubscriptions = (
	spec: AuthoringEntrypointSpec,
	entrypoints: Readonly<Record<string, CompiledEntrypoint>>,
): CompileRefreshSubscriptionsOutput => {
	const diagnostics: CompileDiagnostic[] = [];
	const signalSets = new Map<string, Set<string>>();
	const screens = spec.views?.screens ?? [];

	for (const [screenIndex, screen] of screens.entries()) {
		for (const [slotId, dataQuery] of Object.entries(screen.data ?? {})) {
			const entrypoint = entrypoints[queryKey(dataQuery.query)];
			if (entrypoint === undefined) {
				diagnostics.push({
					severity: "error",
					code: "refresh_query_not_found",
					path: `views.screens.${screenIndex}.data.${slotId}.query`,
					message: `Refresh subscription references unknown query \`${dataQuery.query}\`.`,
				});
				continue;
			}
			const signals = dataQuery.refresh_on_signals ?? [];
			if (signals.length === 0) {
				continue;
			}
			const signalSet = signalSets.get(dataQuery.query) ?? new Set<string>();
			for (const signalId of signals) {
				signalSet.add(signalId);
			}
			signalSets.set(dataQuery.query, signalSet);
		}
	}

	const subscriptions: Record<string, CompiledRefreshSubscription> = {};
	for (const [queryId, signalSet] of signalSets.entries()) {
		subscriptions[queryId] = {
			queryId,
			signalIds: [...signalSet].sort((left, right) =>
				left.localeCompare(right),
			),
		};
	}

	return {
		subscriptions,
		diagnostics,
	};
};
