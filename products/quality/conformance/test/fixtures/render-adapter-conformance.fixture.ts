import type { RunRenderAdapterConformanceInput } from "../../src/render-adapter-conformance/contracts";

/**
 * Builds renderer adapter conformance fixture input.
 */
export const createRenderAdapterConformanceFixture =
	(): RunRenderAdapterConformanceInput => ({
		viewRenderIR: {
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
		},
		supportedCapabilities: {
			adapterId: "web",
			adapterVersion: "1.0.0",
			supportedNodeTypes: ["button", "list"],
			supportedEntrypointKinds: ["query", "mutation", "route"],
			supportedInteractionsByNodeType: {
				button: ["onPress"],
				list: ["onSelect"],
			},
		},
		unsupportedCapabilities: {
			adapterId: "cli",
			adapterVersion: "1.0.0",
			supportedNodeTypes: ["text"],
			supportedEntrypointKinds: ["query"],
			supportedInteractionsByNodeType: {
				button: ["onHover"],
				list: [],
			},
		},
	});
