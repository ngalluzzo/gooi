import type {
	CanonicalSpecModel,
	CompileDiagnostic,
} from "@gooi/app-spec-contracts/compiled";
import type { JsonValue } from "@gooi/contract-primitives/json";
import type {
	CompiledNodeIntentPlan,
	CompiledScreenDataBinding,
	CompiledViewRenderIR,
	CompiledViewScreen,
} from "@gooi/render-contracts/ir";
import { compiledViewRenderIRVersion } from "@gooi/render-contracts/ir";
import type {
	CompiledNodePropPlan,
	CompiledViewRenderNode,
} from "@gooi/render-contracts/nodes";
import { asRecord, asString } from "./cross-links/shared";

interface CompileViewRenderIROutput {
	readonly viewRenderIR: CompiledViewRenderIR;
	readonly diagnostics: readonly CompileDiagnostic[];
}

const sortLexical = (values: readonly string[]): readonly string[] =>
	[...values].sort((left, right) => left.localeCompare(right));

const toStringArray = (value: unknown): readonly string[] =>
	Array.isArray(value)
		? value.filter((item): item is string => typeof item === "string")
		: [];

const safeJsonRecord = (
	value: unknown,
): Readonly<Record<string, CompiledNodePropPlan>> => {
	const record = asRecord(value);
	if (record === undefined) {
		return {};
	}
	const output: Record<string, CompiledNodePropPlan> = {};
	for (const [key, entryValue] of Object.entries(record)) {
		output[key] = {
			value: entryValue as JsonValue,
		};
	}
	return output;
};

const safeJsonValueRecord = (
	value: unknown,
): Readonly<Record<string, JsonValue>> => {
	const record = asRecord(value);
	if (record === undefined) {
		return {};
	}
	return Object.fromEntries(
		Object.entries(record)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, entryValue]) => [key, entryValue as JsonValue]),
	);
};

const compileViewNodes = (
	model: CanonicalSpecModel,
): {
	readonly nodes: Readonly<Record<string, CompiledViewRenderNode>>;
	readonly nodeOrder: readonly string[];
} => {
	const views = asRecord(model.views) ?? {};
	const nodesValue = asRecord(views.nodes);
	const nodes = Array.isArray(nodesValue) ? nodesValue : [];
	const compiledNodes: Record<string, CompiledViewRenderNode> = {};
	const nodeOrder: string[] = [];

	for (const nodeValue of nodes) {
		const nodeRecord = asRecord(nodeValue);
		const nodeId = asString(nodeRecord?.id);
		if (nodeId === undefined) {
			continue;
		}
		nodeOrder.push(nodeId);
		compiledNodes[nodeId] = {
			id: nodeId,
			type: asString(nodeRecord?.type) ?? "unknown",
			propPlans: safeJsonRecord(nodeRecord?.props),
			children: toStringArray(nodeRecord?.children),
			interactions: {},
		};
	}

	return {
		nodes: compiledNodes,
		nodeOrder,
	};
};

const compileViewScreen = (
	screenValue: Readonly<Record<string, unknown>>,
): {
	readonly screen: CompiledViewScreen;
} => {
	const dataRecord = asRecord(screenValue?.data);
	const rawRootNodeIds = toStringArray(screenValue?.root_nodes);
	const screenData: Record<string, CompiledScreenDataBinding> = {};
	const screenId = asString(screenValue?.id) ?? "unknown";

	for (const [slotId, slotValue] of Object.entries(dataRecord ?? {})) {
		const slotRecord = asRecord(slotValue);
		const queryId = asString(slotRecord?.query);
		if (queryId === undefined) {
			continue;
		}
		screenData[slotId] = {
			queryId,
			refreshOnSignals: toStringArray(slotRecord?.refresh_on_signals),
			...(asRecord(slotRecord?.args) === undefined
				? {}
				: { args: safeJsonValueRecord(slotRecord?.args) }),
		};
	}

	return {
		screen: {
			id: screenId,
			data: screenData,
			rootNodeIds: rawRootNodeIds,
		},
	};
};

const compileScreens = (
	model: CanonicalSpecModel,
): {
	readonly screens: Readonly<Record<string, CompiledViewScreen>>;
	readonly screenOrder: readonly string[];
} => {
	const views = asRecord(model.views) ?? {};
	const screensValue = asRecord(views.screens);
	const screens = Array.isArray(screensValue) ? screensValue : [];
	const compiledScreens: Record<string, CompiledViewScreen> = {};
	const screenOrder: string[] = [];

	for (const screenValue of screens) {
		const screenRecord = asRecord(screenValue);
		if (screenRecord === undefined) {
			continue;
		}
		const screenId = asString(screenRecord?.id);
		if (screenId === undefined) {
			continue;
		}
		screenOrder.push(screenId);
		const { screen } = compileViewScreen(screenRecord);
		compiledScreens[screenId] = screen;
	}

	return {
		screens: compiledScreens,
		screenOrder,
	};
};

const mapIntentPlans = (
	nodes: Readonly<Record<string, CompiledViewRenderNode>>,
) =>
	Object.freeze(
		Object.fromEntries(
			Object.keys(nodes)
				.sort((left, right) => left.localeCompare(right))
				.map(
					(nodeId) =>
						[
							nodeId,
							{
								nodeId,
								interactionPlans: {},
							} as CompiledNodeIntentPlan,
						] as const,
				),
		),
	);

/**
 * Compiles view definitions into canonical render IR.
 */
export const compileViewRenderIR = (
	model: CanonicalSpecModel,
): CompileViewRenderIROutput => {
	const nodesOutput = compileViewNodes(model);
	const screensOutput = compileScreens(model);
	const diagnostics: CompileDiagnostic[] = [];

	const nodeIds = new Set(model.references.viewNodeIds);
	for (const [screenId, screenRecord] of Object.entries(
		screensOutput.screens,
	)) {
		const rootNodeIds = [...screenRecord.rootNodeIds];
		if (rootNodeIds.length > 0) {
			const unknownRoot = rootNodeIds.filter((nodeId) => !nodeIds.has(nodeId));
			if (unknownRoot.length > 0) {
				diagnostics.push({
					severity: "error",
					code: "view_root_node_not_found",
					path: `views.screens.${screenId}.root_nodes`,
					message: `Screen \`${screenId}\` references unknown root nodes: ${unknownRoot.join(", ")}.`,
				});
			}
		}
	}

	const viewRenderIR: CompiledViewRenderIR = {
		artifactVersion: compiledViewRenderIRVersion,
		nodes: nodesOutput.nodes,
		screens: screensOutput.screens,
		screenOrder: screensOutput.screenOrder,
		nodeOrder: sortLexical(nodesOutput.nodeOrder),
		nodeIntentPlans: mapIntentPlans(nodesOutput.nodes),
	};

	return {
		viewRenderIR,
		diagnostics,
	};
};
