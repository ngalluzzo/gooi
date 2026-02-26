import type {
	SignalImpactDerivationInput,
	SymbolReferenceEdge,
} from "./contracts";

/**
 * Derives signal impact edges used by "affected queries" code lenses.
 *
 * Emitted edge chain:
 *
 * 1. `action -> signal` as `emits_signal`.
 * 2. `signal -> query` as `refresh_subscription`.
 * 3. `action -> query` as `impacts_query`.
 *
 * @param input - Signal impact derivation input.
 * @returns Deduplicated derived edges.
 *
 * @example
 * deriveSignalImpactEdges({
 *   actions: [{ actionSymbolId: "action.submit", emittedSignalSymbolIds: ["signal.created"] }],
 *   queries: [{ querySymbolId: "query.messages", refreshOnSignalSymbolIds: ["signal.created"] }],
 * });
 */
export const deriveSignalImpactEdges = (
	input: SignalImpactDerivationInput,
): readonly SymbolReferenceEdge[] => {
	const emittedEdges: SymbolReferenceEdge[] = [];
	const refreshEdges: SymbolReferenceEdge[] = [];
	const impactEdges: SymbolReferenceEdge[] = [];

	const signalToQueries = new Map<string, Set<string>>();

	for (const query of input.queries) {
		for (const signalSymbolId of query.refreshOnSignalSymbolIds) {
			refreshEdges.push({
				fromSymbolId: signalSymbolId,
				toSymbolId: query.querySymbolId,
				relationship: "refresh_subscription",
			});

			const queries = signalToQueries.get(signalSymbolId) ?? new Set<string>();
			queries.add(query.querySymbolId);
			signalToQueries.set(signalSymbolId, queries);
		}
	}

	for (const action of input.actions) {
		for (const signalSymbolId of action.emittedSignalSymbolIds) {
			emittedEdges.push({
				fromSymbolId: action.actionSymbolId,
				toSymbolId: signalSymbolId,
				relationship: "emits_signal",
			});

			for (const querySymbolId of signalToQueries.get(signalSymbolId) ?? []) {
				impactEdges.push({
					fromSymbolId: action.actionSymbolId,
					toSymbolId: querySymbolId,
					relationship: "impacts_query",
				});
			}
		}
	}

	const deduplicated = new Map<string, SymbolReferenceEdge>();
	for (const edge of [...emittedEdges, ...refreshEdges, ...impactEdges]) {
		deduplicated.set(
			`${edge.relationship}:${edge.fromSymbolId}:${edge.toSymbolId}`,
			edge,
		);
	}

	return [...deduplicated.values()].sort((left, right) => {
		if (left.relationship !== right.relationship) {
			return left.relationship.localeCompare(right.relationship);
		}
		if (left.fromSymbolId !== right.fromSymbolId) {
			return left.fromSymbolId.localeCompare(right.fromSymbolId);
		}
		return left.toSymbolId.localeCompare(right.toSymbolId);
	});
};
