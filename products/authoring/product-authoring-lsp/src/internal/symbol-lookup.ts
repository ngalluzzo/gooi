import type {
	SymbolGraphSnapshot,
	SymbolGraphSymbol,
} from "@gooi/symbol-graph/contracts";

import type { AuthoringLocation } from "../contracts/navigation-contracts";
import type { AuthoringReadContext } from "../contracts/read-context";

export interface ResolvedDefinition {
	readonly symbol: SymbolGraphSymbol;
	readonly declaration: SymbolGraphSymbol;
}

const bySymbolLocation = (
	left: SymbolGraphSymbol,
	right: SymbolGraphSymbol,
): number => {
	if (left.location.line !== right.location.line) {
		return left.location.line - right.location.line;
	}
	if (left.location.character !== right.location.character) {
		return left.location.character - right.location.character;
	}
	return left.id.localeCompare(right.id);
};

/**
 * Converts a symbol graph symbol into an authoring location payload.
 *
 * @param context - Read context containing document metadata.
 * @param symbol - Symbol to convert.
 * @returns Authoring location payload.
 *
 * @example
 * const location = symbolToAuthoringLocation(context, symbol);
 */
export const symbolToAuthoringLocation = (
	context: AuthoringReadContext,
	symbol: SymbolGraphSymbol,
): AuthoringLocation => ({
	documentUri: context.documentUri,
	documentPath: symbol.location.path,
	symbolId: symbol.id,
	range: {
		start: {
			line: symbol.location.line,
			character: symbol.location.character,
		},
		end: {
			line: symbol.location.line,
			character: symbol.location.character + symbol.name.length,
		},
	},
});

/**
 * Resolves a symbol by exact name match in deterministic location order.
 *
 * @param snapshot - Symbol graph snapshot.
 * @param name - Symbol name to match.
 * @returns Matching symbol when available.
 *
 * @example
 * const symbol = findSymbolByName(snapshot, "message.created");
 */
export const findSymbolByName = (
	snapshot: SymbolGraphSnapshot,
	name: string,
): SymbolGraphSymbol | undefined =>
	[...snapshot.symbols]
		.filter((symbol) => symbol.name === name)
		.sort(bySymbolLocation)[0];

/**
 * Resolves declaration symbol for navigation and references.
 *
 * For expression variables, follows `references` edges to the declaration symbol.
 *
 * @param snapshot - Symbol graph snapshot.
 * @param symbol - Selected symbol under cursor.
 * @returns Cursor symbol and declaration symbol pair.
 *
 * @example
 * const resolved = resolveDefinitionSymbol(snapshot, selectedSymbol);
 */
export const resolveDefinitionSymbol = (
	snapshot: SymbolGraphSnapshot,
	symbol: SymbolGraphSymbol,
): ResolvedDefinition => {
	if (symbol.kind !== "expression_variable") {
		return { symbol, declaration: symbol };
	}

	const referenceEdge = [...snapshot.references]
		.filter(
			(edge) =>
				edge.relationship === "references" && edge.fromSymbolId === symbol.id,
		)
		.sort((left, right) => left.toSymbolId.localeCompare(right.toSymbolId))[0];

	if (referenceEdge === undefined) {
		return { symbol, declaration: symbol };
	}

	const declaration = snapshot.symbols.find(
		(candidate) => candidate.id === referenceEdge.toSymbolId,
	);
	return declaration === undefined
		? { symbol, declaration: symbol }
		: { symbol, declaration };
};
