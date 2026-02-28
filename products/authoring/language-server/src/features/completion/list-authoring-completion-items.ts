import type { SymbolGraphSymbol } from "@gooi/symbol-graph/contracts";

import {
	type AuthoringCompletionItem,
	type AuthoringCompletionRequest,
	authoringCompletionListSchema,
	authoringCompletionRequestSchema,
} from "../../contracts/completion-contracts";
import { inferCompletionDomain } from "../../internal/completion-context";
import { getLineTextAtPosition } from "../../internal/document-token";
import { evaluateAuthoringReadParity } from "../../internal/lockfile-parity";
import {
	sourceSpecCaptureSources,
	sourceSpecFlowIds,
	sourceSpecGuardPolicies,
	sourceSpecMutationIds,
	sourceSpecPersonaIds,
	sourceSpecProjectionIds,
	sourceSpecQueryIds,
	sourceSpecScenarioIds,
} from "../../internal/source-spec";

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

const toSimpleCompletionItem = (input: {
	readonly label: string;
	readonly kind: AuthoringCompletionItem["kind"];
}): AuthoringCompletionItem => ({
	label: input.label,
	kind: input.kind,
	insertText: input.label,
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

const inferExtendedCompletionItems = (
	request: AuthoringCompletionRequest,
): AuthoringCompletionItem[] | undefined => {
	if (request.context.sourceSpec === undefined) {
		return undefined;
	}

	const lineText = getLineTextAtPosition({
		documentText: request.context.documentText,
		position: request.position,
	});
	const projectionItems = sourceSpecProjectionIds(
		request.context.sourceSpec,
	).map((label) => toSimpleCompletionItem({ label, kind: "projection" }));
	const flowItems = sourceSpecFlowIds(request.context.sourceSpec).map((label) =>
		toSimpleCompletionItem({ label, kind: "flow" }),
	);
	const personaItems = sourceSpecPersonaIds(request.context.sourceSpec).map(
		(label) => toSimpleCompletionItem({ label, kind: "persona" }),
	);
	const scenarioItems = sourceSpecScenarioIds(request.context.sourceSpec).map(
		(label) => toSimpleCompletionItem({ label, kind: "scenario" }),
	);
	const queryItems = sourceSpecQueryIds(request.context.sourceSpec).map(
		(label) => toSimpleCompletionItem({ label, kind: "entrypoint" }),
	);
	const mutationItems = sourceSpecMutationIds(request.context.sourceSpec).map(
		(label) => toSimpleCompletionItem({ label, kind: "entrypoint" }),
	);
	const guardPolicyItems = sourceSpecGuardPolicies.map((label) =>
		toSimpleCompletionItem({ label, kind: "guard_policy" }),
	);
	const captureSourceItems = sourceSpecCaptureSources.map((label) =>
		toSimpleCompletionItem({ label, kind: "scenario" }),
	);

	if (lineText.includes("onFail:")) {
		return guardPolicyItems;
	}
	if (lineText.includes("persona:")) {
		return personaItems;
	}
	if (lineText.includes("source:")) {
		return captureSourceItems;
	}
	if (lineText.includes("flowId:") || lineText.includes("flow_completed:")) {
		return flowItems;
	}
	if (lineText.includes("projection:")) {
		return projectionItems;
	}
	if (lineText.includes("query:")) {
		return queryItems;
	}
	if (lineText.includes("mutation:")) {
		return mutationItems;
	}
	if (lineText.includes("scenario:")) {
		return scenarioItems;
	}
	return undefined;
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
	const extendedItems = inferExtendedCompletionItems(request);

	const capabilityItems =
		request.context.capabilityIndexSnapshot.capabilities.map(
			toCapabilityCompletionItem,
		);
	const signalItems = request.context.symbolGraphSnapshot.symbols
		.filter((symbol) => symbol.kind === "signal")
		.map(toSignalCompletionItem)
		.sort(byLabel);

	const scopedItems =
		extendedItems ??
		(domain === "capability"
			? capabilityItems
			: domain === "signal"
				? signalItems
				: deduplicate([...capabilityItems, ...signalItems]));

	return authoringCompletionListSchema.parse({
		parity,
		items: [...scopedItems].sort(byLabel),
	});
};
