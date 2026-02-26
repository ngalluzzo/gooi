import { authoringNavigationRequestSchema } from "../../contracts/navigation-contracts";
import { authoringDefinitionResultSchema } from "../../contracts/navigation-results";
import { getTokenAtPosition } from "../../internal/document-token";
import { evaluateAuthoringReadParity } from "../../internal/lockfile-parity";
import {
	findSymbolByName,
	resolveDefinitionSymbol,
	symbolToAuthoringLocation,
} from "../../internal/symbol-lookup";

/**
 * Resolves symbol definition for `textDocument/definition` read-path handlers.
 *
 * @param value - Untrusted navigation request.
 * @returns Definition location with parity state.
 *
 * @example
 * const result = getAuthoringDefinition({ context, position: { line: 9, character: 4 } });
 */
export const getAuthoringDefinition = (value: unknown) => {
	const request = authoringNavigationRequestSchema.parse(value);
	const parity = evaluateAuthoringReadParity(request.context);
	const token = getTokenAtPosition({
		documentText: request.context.documentText,
		position: request.position,
	});
	if (token === null) {
		return authoringDefinitionResultSchema.parse({ parity, location: null });
	}

	const symbol = findSymbolByName(
		request.context.symbolGraphSnapshot,
		token.value,
	);
	if (symbol === undefined) {
		return authoringDefinitionResultSchema.parse({ parity, location: null });
	}

	const resolved = resolveDefinitionSymbol(
		request.context.symbolGraphSnapshot,
		symbol,
	);

	return authoringDefinitionResultSchema.parse({
		parity,
		location: symbolToAuthoringLocation(request.context, resolved.declaration),
	});
};
