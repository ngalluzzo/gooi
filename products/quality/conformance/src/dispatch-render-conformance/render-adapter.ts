import type { JsonValue } from "@gooi/contract-primitives/json";
import {
	type EvaluatedRenderNode,
	type RenderDiagnosticEnvelope,
	type RenderEvaluationEnvelope,
	renderDiagnosticEnvelopeVersion,
	renderEvaluationEnvelopeVersion,
} from "@gooi/render-contracts/envelopes";
import type { RunDispatchRenderConformanceInput } from "./contracts";

const sortLexical = (values: readonly string[]): readonly string[] =>
	[...values].sort((left, right) => left.localeCompare(right));

export const toRenderDiagnostic = (input: {
	readonly code: string;
	readonly message: string;
	readonly details?: Readonly<Record<string, JsonValue>>;
}): RenderDiagnosticEnvelope => ({
	envelopeVersion: renderDiagnosticEnvelopeVersion,
	code: input.code,
	message: input.message,
	...(input.details === undefined ? {} : { details: input.details }),
});

const toEvaluatedNode = (input: {
	readonly nodeId: string;
	readonly viewRenderIR: RunDispatchRenderConformanceInput["bundle"]["viewRenderIR"];
}): EvaluatedRenderNode | undefined => {
	const node = input.viewRenderIR.nodes[input.nodeId];
	if (node === undefined) {
		return undefined;
	}
	const children = input.viewRenderIR.nodes[input.nodeId]?.children ?? [];
	return {
		nodeId: node.id,
		nodeType: node.type,
		props: Object.fromEntries(
			Object.entries(node.propPlans)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([propId, propPlan]) => [propId, propPlan.value]),
		),
		children: children
			.map((childNodeId) =>
				toEvaluatedNode({
					nodeId: childNodeId,
					viewRenderIR: input.viewRenderIR,
				}),
			)
			.filter((item): item is EvaluatedRenderNode => item !== undefined),
		interactionIds: sortLexical(Object.keys(node.interactions)),
	};
};

export const buildRenderTree = (input: {
	readonly suiteInput: RunDispatchRenderConformanceInput;
	readonly queryOutput: unknown;
}): EvaluatedRenderNode | undefined => {
	const screen =
		input.suiteInput.bundle.viewRenderIR.screens[input.suiteInput.screenId];
	if (screen === undefined) {
		return undefined;
	}

	const slotData: Record<string, JsonValue> = {};
	for (const slotId of sortLexical(Object.keys(screen.data))) {
		slotData[slotId] = input.queryOutput as JsonValue;
	}

	return {
		nodeId: `screen:${screen.id}`,
		nodeType: "screen",
		props: {
			slotData,
		},
		children: screen.rootNodeIds
			.map((nodeId) =>
				toEvaluatedNode({
					nodeId,
					viewRenderIR: input.suiteInput.bundle.viewRenderIR,
				}),
			)
			.filter((item): item is EvaluatedRenderNode => item !== undefined),
		interactionIds: [],
	};
};

export const toRenderEnvelope = (input: {
	readonly screenId: string;
	readonly tree: EvaluatedRenderNode;
}): RenderEvaluationEnvelope => ({
	envelopeVersion: renderEvaluationEnvelopeVersion,
	ok: true,
	screenId: input.screenId,
	tree: input.tree,
});
