import {
	type AuthoringCodeLens,
	authoringCodeLensListRequestSchema,
	authoringCodeLensListResultSchema,
} from "../../contracts/code-lens-contracts";
import { evaluateAuthoringReadParity } from "../../internal/lockfile-parity";

const byLensOrder = (
	left: AuthoringCodeLens,
	right: AuthoringCodeLens,
): number => {
	if (left.range.start.line !== right.range.start.line) {
		return left.range.start.line - right.range.start.line;
	}
	if (left.range.start.character !== right.range.start.character) {
		return left.range.start.character - right.range.start.character;
	}
	if (left.kind !== right.kind) {
		return left.kind.localeCompare(right.kind);
	}
	return left.symbolId.localeCompare(right.symbolId);
};

/**
 * Lists unresolved code lenses for authoring action handlers.
 *
 * @param value - Untrusted code-lens list request.
 * @returns Deterministic unresolved code lenses with parity state.
 *
 * @example
 * const result = listAuthoringCodeLenses({ context });
 */
export const listAuthoringCodeLenses = (value: unknown) => {
	const request = authoringCodeLensListRequestSchema.parse(value);
	const parity = evaluateAuthoringReadParity(request.context);

	const lenses: AuthoringCodeLens[] = [];
	for (const symbol of request.context.symbolGraphSnapshot.symbols) {
		const range = {
			start: {
				line: symbol.location.line,
				character: symbol.location.character,
			},
			end: {
				line: symbol.location.line,
				character: symbol.location.character + symbol.name.length,
			},
		};

		if (symbol.kind === "action" || symbol.kind === "entrypoint") {
			lenses.push({
				kind: "run_query_or_mutation",
				symbolId: symbol.id,
				range,
			});
		}
		if (symbol.kind === "capability") {
			lenses.push({
				kind: "show_providers_for_capability",
				symbolId: symbol.id,
				range,
				data: { capabilityId: symbol.name },
			});
		}
		if (symbol.kind === "signal") {
			lenses.push({
				kind: "show_affected_queries_for_signal",
				symbolId: symbol.id,
				range,
			});
		}
	}

	return authoringCodeLensListResultSchema.parse({
		parity,
		lenses: lenses.sort(byLensOrder),
	});
};
