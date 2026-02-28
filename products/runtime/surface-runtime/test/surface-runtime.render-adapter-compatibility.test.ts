import { describe, expect, test } from "bun:test";
import type { RendererAdapterCapabilityProfile } from "@gooi/render-contracts/adapter";
import type { CompiledViewRenderIR } from "@gooi/render-contracts/ir";
import { validateRendererAdapterCompatibility } from "../src/engine";

const renderIRFixture: CompiledViewRenderIR = {
	artifactVersion: "1.0.0",
	screens: {
		home: {
			id: "home",
			data: {},
			rootNodeIds: ["send_button", "messages_list"],
		},
	},
	nodes: {
		send_button: {
			id: "send_button",
			type: "button",
			propPlans: {},
			children: [],
			interactions: {
				onPress: {
					entrypointKind: "mutation",
					entrypointId: "submit_message",
					input: {},
				},
			},
		},
		messages_list: {
			id: "messages_list",
			type: "list",
			propPlans: {},
			children: [],
			interactions: {
				onSelect: {
					entrypointKind: "query",
					entrypointId: "list_messages",
					input: {},
				},
			},
		},
	},
	screenOrder: ["home"],
	nodeOrder: ["send_button", "messages_list"],
	nodeIntentPlans: {
		send_button: {
			nodeId: "send_button",
			interactionPlans: {
				onPress: {
					entrypointKind: "mutation",
					entrypointId: "submit_message",
					input: {},
				},
			},
		},
		messages_list: {
			nodeId: "messages_list",
			interactionPlans: {
				onSelect: {
					entrypointKind: "query",
					entrypointId: "list_messages",
					input: {},
				},
			},
		},
	},
};

describe("surface-runtime render adapter compatibility", () => {
	test("passes when adapter supports all node and interaction paths", () => {
		const capabilities: RendererAdapterCapabilityProfile = {
			adapterId: "web",
			adapterVersion: "1.0.0",
			supportedNodeTypes: ["button", "list"],
			supportedEntrypointKinds: ["query", "mutation", "route"],
			supportedInteractionsByNodeType: {
				button: ["onPress"],
				list: ["onSelect"],
			},
		};

		const result = validateRendererAdapterCompatibility({
			viewRenderIR: renderIRFixture,
			capabilities,
		});

		expect(result.ok).toBe(true);
		expect(result.diagnostics).toEqual([]);
	});

	test("returns typed compatibility diagnostics for unsupported component paths", () => {
		const capabilities: RendererAdapterCapabilityProfile = {
			adapterId: "cli",
			adapterVersion: "1.0.0",
			supportedNodeTypes: ["text"],
			supportedEntrypointKinds: ["query"],
			supportedInteractionsByNodeType: {
				button: ["onHover"],
				list: [],
			},
		};

		const result = validateRendererAdapterCompatibility({
			viewRenderIR: renderIRFixture,
			capabilities,
		});

		expect(result.ok).toBe(false);
		expect(result.diagnostics.length).toBe(5);
		expect(
			result.diagnostics.every(
				(item) => item.code === "render_adapter_capability_error",
			),
		).toBe(true);
		expect(result.diagnostics[0]?.details?.reason).toBe(
			"unsupported_node_type",
		);
		expect(result.diagnostics[1]?.details?.reason).toBe(
			"unsupported_interaction",
		);
		expect(result.diagnostics[2]?.details?.reason).toBe(
			"unsupported_entrypoint_kind",
		);
	});
});
