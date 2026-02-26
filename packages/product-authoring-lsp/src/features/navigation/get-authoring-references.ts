import { authoringReferencesRequestSchema } from "../../contracts/navigation-contracts";
import { authoringReferencesResultSchema } from "../../contracts/navigation-results";
import { getTokenAtPosition } from "../../internal/document-token";
import { evaluateAuthoringReadParity } from "../../internal/lockfile-parity";
import {
	findSymbolByName,
	resolveDefinitionSymbol,
	symbolToAuthoringLocation,
} from "../../internal/symbol-lookup";

const byLocation = (
	left: {
		symbolId: string;
		range: { start: { line: number; character: number } };
	},
	right: {
		symbolId: string;
		range: { start: { line: number; character: number } };
	},
): number => {
	if (left.range.start.line !== right.range.start.line) {
		return left.range.start.line - right.range.start.line;
	}
	if (left.range.start.character !== right.range.start.character) {
		return left.range.start.character - right.range.start.character;
	}
	return left.symbolId.localeCompare(right.symbolId);
};

/**
 * Resolves references for `textDocument/references` read-path handlers.
 *
 * @param value - Untrusted references request.
 * @returns Reference locations with parity state.
 *
 * @example
 * const result = getAuthoringReferences({ context, position: { line: 9, character: 4 } });
 */
export const getAuthoringReferences = (value: unknown) => {
	const request = authoringReferencesRequestSchema.parse(value);
	const parity = evaluateAuthoringReadParity(request.context);
	const token = getTokenAtPosition({
		documentText: request.context.documentText,
		position: request.position,
	});
	if (token === null) {
		return authoringReferencesResultSchema.parse({ parity, items: [] });
	}

	const symbol = findSymbolByName(
		request.context.symbolGraphSnapshot,
		token.value,
	);
	if (symbol === undefined) {
		return authoringReferencesResultSchema.parse({ parity, items: [] });
	}

	const { declaration } = resolveDefinitionSymbol(
		request.context.symbolGraphSnapshot,
		symbol,
	);

	const references = request.context.symbolGraphSnapshot.references
		.filter(
			(edge) =>
				edge.relationship === "references" &&
				edge.toSymbolId === declaration.id,
		)
		.map((edge) =>
			request.context.symbolGraphSnapshot.symbols.find(
				(candidate) => candidate.id === edge.fromSymbolId,
			),
		)
		.filter((candidate) => candidate !== undefined)
		.map((candidate) => symbolToAuthoringLocation(request.context, candidate));

	const items = request.includeDeclaration
		? [...references, symbolToAuthoringLocation(request.context, declaration)]
		: references;

	return authoringReferencesResultSchema.parse({
		parity,
		items: [...items].sort(byLocation),
	});
};
