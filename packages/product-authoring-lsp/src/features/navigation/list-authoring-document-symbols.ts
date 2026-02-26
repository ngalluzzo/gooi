import { authoringDocumentSymbolRequestSchema } from "../../contracts/navigation-contracts";
import { authoringDocumentSymbolResultSchema } from "../../contracts/navigation-results";
import { evaluateAuthoringReadParity } from "../../internal/lockfile-parity";

const bySymbolLocation = (
	left: {
		location: { line: number; character: number };
		name: string;
		id: string;
	},
	right: {
		location: { line: number; character: number };
		name: string;
		id: string;
	},
): number => {
	if (left.location.line !== right.location.line) {
		return left.location.line - right.location.line;
	}
	if (left.location.character !== right.location.character) {
		return left.location.character - right.location.character;
	}
	if (left.name !== right.name) {
		return left.name.localeCompare(right.name);
	}
	return left.id.localeCompare(right.id);
};

/**
 * Lists document symbols for `textDocument/documentSymbol` read-path handlers.
 *
 * @param value - Untrusted document symbol request.
 * @returns Deterministic document symbols with parity state.
 *
 * @example
 * const result = listAuthoringDocumentSymbols({ context });
 */
export const listAuthoringDocumentSymbols = (value: unknown) => {
	const request = authoringDocumentSymbolRequestSchema.parse(value);
	const parity = evaluateAuthoringReadParity(request.context);

	const items = request.context.symbolGraphSnapshot.symbols
		.filter((symbol) => symbol.location.path === request.context.documentPath)
		.sort(bySymbolLocation)
		.map((symbol) => ({
			symbolId: symbol.id,
			name: symbol.name,
			kind: symbol.kind,
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
		}));

	return authoringDocumentSymbolResultSchema.parse({
		parity,
		items,
	});
};
