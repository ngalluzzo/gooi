import { resolveCapability } from "@gooi/capability-index/resolve";

import { authoringNavigationRequestSchema } from "../../contracts/navigation-contracts";
import { authoringHoverResultSchema } from "../../contracts/navigation-results";
import { getTokenAtPosition } from "../../internal/document-token";
import { evaluateAuthoringReadParity } from "../../internal/lockfile-parity";
import { findSymbolByName } from "../../internal/symbol-lookup";

/**
 * Resolves hover payload for a cursor position in the active document.
 *
 * @param value - Untrusted navigation request.
 * @returns Hover payload with parity state.
 *
 * @example
 * const result = getAuthoringHover({ context, position: { line: 3, character: 12 } });
 */
export const getAuthoringHover = (value: unknown) => {
	const request = authoringNavigationRequestSchema.parse(value);
	const parity = evaluateAuthoringReadParity(request.context);
	const token = getTokenAtPosition({
		documentText: request.context.documentText,
		position: request.position,
	});

	if (token === null) {
		return authoringHoverResultSchema.parse({ parity, hover: null });
	}

	const capability = resolveCapability(
		request.context.capabilityIndexSnapshot,
		{
			capabilityId: token.value,
		},
	);
	if (capability !== undefined) {
		return authoringHoverResultSchema.parse({
			parity,
			hover: {
				symbolId: `capability:${capability.capabilityId}`,
				contents: [
					`capability ${capability.capabilityId}@${capability.capabilityVersion}`,
					`provenance: ${capability.provenance}`,
					`certification: ${capability.certificationState}`,
					`trust tier: ${capability.trustTier}`,
					`last verified at: ${capability.lastVerifiedAt ?? "unknown"}`,
					`effects: ${capability.declaredEffects.join(", ")}`,
				].join("\n"),
				range: {
					start: {
						line: request.position.line,
						character: token.startCharacter,
					},
					end: {
						line: request.position.line,
						character: token.endCharacter,
					},
				},
			},
		});
	}

	const symbol = findSymbolByName(
		request.context.symbolGraphSnapshot,
		token.value,
	);
	if (symbol === undefined) {
		return authoringHoverResultSchema.parse({ parity, hover: null });
	}

	return authoringHoverResultSchema.parse({
		parity,
		hover: {
			symbolId: symbol.id,
			contents: `${symbol.kind} ${symbol.name}`,
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
		},
	});
};
