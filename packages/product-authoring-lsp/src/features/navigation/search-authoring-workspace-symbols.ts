import { authoringWorkspaceSymbolRequestSchema } from "../../contracts/navigation-contracts";
import { authoringWorkspaceSymbolResultSchema } from "../../contracts/navigation-results";
import { evaluateAuthoringReadParity } from "../../internal/lockfile-parity";

const byWorkspaceSymbol = (
	left: {
		name: string;
		location: { path: string; line: number; character: number };
	},
	right: {
		name: string;
		location: { path: string; line: number; character: number };
	},
): number => {
	if (left.name !== right.name) {
		return left.name.localeCompare(right.name);
	}
	if (left.location.path !== right.location.path) {
		return left.location.path.localeCompare(right.location.path);
	}
	if (left.location.line !== right.location.line) {
		return left.location.line - right.location.line;
	}
	return left.location.character - right.location.character;
};

/**
 * Searches workspace symbols for `workspace/symbol` read-path handlers.
 *
 * @param value - Untrusted workspace symbol request.
 * @returns Filtered workspace symbols with parity state.
 *
 * @example
 * const result = searchAuthoringWorkspaceSymbols({ context, query: "message" });
 */
export const searchAuthoringWorkspaceSymbols = (value: unknown) => {
	const request = authoringWorkspaceSymbolRequestSchema.parse(value);
	const parity = evaluateAuthoringReadParity(request.context);
	const normalizedQuery = request.query.trim().toLowerCase();

	const items = request.context.symbolGraphSnapshot.symbols
		.filter((symbol) =>
			normalizedQuery.length === 0
				? true
				: symbol.name.toLowerCase().includes(normalizedQuery),
		)
		.sort(byWorkspaceSymbol)
		.map((symbol) => ({
			symbolId: symbol.id,
			name: symbol.name,
			kind: symbol.kind,
			documentUri: request.context.documentUri,
			documentPath: symbol.location.path,
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

	return authoringWorkspaceSymbolResultSchema.parse({
		parity,
		items,
	});
};
