import type { SymbolGraphSymbol } from "@gooi/symbol-graph/contracts";

import {
	type AuthoringCompletionItem,
	type AuthoringCompletionRequest,
	authoringCompletionListSchema,
	authoringCompletionRequestSchema,
} from "../../contracts/completion-contracts";
import { inferCompletionDomain } from "../../internal/completion-context";
import { evaluateAuthoringReadParity } from "../../internal/lockfile-parity";

const toCapabilityCompletionItem = (
	entry: AuthoringCompletionRequest["context"]["capabilityIndexSnapshot"]["capabilities"][number],
): AuthoringCompletionItem => ({
	label: entry.capabilityId,
	kind: "capability",
	insertText: entry.capabilityId,
	deprecated: entry.deprecation.isDeprecated,
	data: {
		capabilityId: entry.capabilityId,
		capabilityVersion: entry.capabilityVersion,
	},
});

const toSignalCompletionItem = (
	symbol: SymbolGraphSymbol,
): AuthoringCompletionItem => ({
	label: symbol.name,
	kind: "signal",
	insertText: symbol.name,
	data: {
		symbolId: symbol.id,
	},
});

const byLabel = (
	left: AuthoringCompletionItem,
	right: AuthoringCompletionItem,
): number => left.label.localeCompare(right.label);

const deduplicate = (
	items: readonly AuthoringCompletionItem[],
): AuthoringCompletionItem[] => {
	const map = new Map<string, AuthoringCompletionItem>();
	for (const item of items) {
		map.set(`${item.kind}:${item.label}`, item);
	}
	return [...map.values()].sort(byLabel);
};

/**
 * Lists completion items for `textDocument/completion` read-path handlers.
 *
 * @param value - Untrusted completion request.
 * @returns Deterministic completion list with parity state.
 *
 * @example
 * const result = listAuthoringCompletionItems({ context, position: { line: 1, character: 2 } });
 */
export const listAuthoringCompletionItems = (value: unknown) => {
	const request = authoringCompletionRequestSchema.parse(value);
	const parity = evaluateAuthoringReadParity(request.context);
	const domain = inferCompletionDomain({
		documentText: request.context.documentText,
		position: request.position,
	});

	const capabilityItems =
		request.context.capabilityIndexSnapshot.capabilities.map(
			toCapabilityCompletionItem,
		);
	const signalItems = request.context.symbolGraphSnapshot.symbols
		.filter((symbol) => symbol.kind === "signal")
		.map(toSignalCompletionItem)
		.sort(byLabel);

	const items =
		domain === "capability"
			? capabilityItems
			: domain === "signal"
				? signalItems
				: deduplicate([...capabilityItems, ...signalItems]);

	return authoringCompletionListSchema.parse({
		parity,
		items: [...items].sort(byLabel),
	});
};
