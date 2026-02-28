import type {
	RenderAdapterCompatibilityDiagnostic,
	RenderAdapterCompatibilityResult,
	RendererAdapterCapabilityProfile,
} from "@gooi/render-contracts/adapter";
import { renderDiagnosticEnvelopeVersion } from "@gooi/render-contracts/envelopes";
import type { CompiledViewRenderIR } from "@gooi/render-contracts/ir";
import type {
	CompiledViewRenderNode,
	RenderEntrypointKind,
} from "@gooi/render-contracts/nodes";

export interface ValidateRendererAdapterCompatibilityInput {
	readonly viewRenderIR: CompiledViewRenderIR;
	readonly capabilities: RendererAdapterCapabilityProfile;
}

const sortLexical = (values: readonly string[]): readonly string[] =>
	[...values].sort((left, right) => left.localeCompare(right));

const hasSupportedNodeType = (
	capabilities: RendererAdapterCapabilityProfile,
	nodeType: string,
): boolean => new Set(capabilities.supportedNodeTypes).has(nodeType);

const hasSupportedEntrypointKind = (
	capabilities: RendererAdapterCapabilityProfile,
	entrypointKind: RenderEntrypointKind,
): boolean =>
	new Set(capabilities.supportedEntrypointKinds).has(entrypointKind);

const hasSupportedInteraction = (
	capabilities: RendererAdapterCapabilityProfile,
	nodeType: string,
	interactionId: string,
): boolean => {
	const interactionByNodeType = capabilities.supportedInteractionsByNodeType;
	if (interactionByNodeType === undefined) {
		return true;
	}
	const supportedInteractions = interactionByNodeType[nodeType];
	if (supportedInteractions === undefined) {
		return true;
	}
	return new Set(supportedInteractions).has(interactionId);
};

const unsupportedNodeTypeDiagnostic = (input: {
	readonly adapterId: string;
	readonly nodeId: string;
	readonly nodeType: string;
}): RenderAdapterCompatibilityDiagnostic => ({
	envelopeVersion: renderDiagnosticEnvelopeVersion,
	code: "render_adapter_capability_error",
	message: `Renderer adapter \`${input.adapterId}\` does not support node type \`${input.nodeType}\`.`,
	path: `viewRenderIR.nodes.${input.nodeId}.type`,
	details: {
		adapterId: input.adapterId,
		reason: "unsupported_node_type",
		nodeId: input.nodeId,
		nodeType: input.nodeType,
	},
});

const unsupportedInteractionDiagnostic = (input: {
	readonly adapterId: string;
	readonly nodeId: string;
	readonly nodeType: string;
	readonly interactionId: string;
}): RenderAdapterCompatibilityDiagnostic => ({
	envelopeVersion: renderDiagnosticEnvelopeVersion,
	code: "render_adapter_capability_error",
	message: `Renderer adapter \`${input.adapterId}\` does not support interaction \`${input.interactionId}\` for node type \`${input.nodeType}\`.`,
	path: `viewRenderIR.nodes.${input.nodeId}.interactions.${input.interactionId}`,
	details: {
		adapterId: input.adapterId,
		reason: "unsupported_interaction",
		nodeId: input.nodeId,
		nodeType: input.nodeType,
		interactionId: input.interactionId,
	},
});

const unsupportedEntrypointKindDiagnostic = (input: {
	readonly adapterId: string;
	readonly nodeId: string;
	readonly nodeType: string;
	readonly interactionId: string;
	readonly entrypointKind: RenderEntrypointKind;
}): RenderAdapterCompatibilityDiagnostic => ({
	envelopeVersion: renderDiagnosticEnvelopeVersion,
	code: "render_adapter_capability_error",
	message: `Renderer adapter \`${input.adapterId}\` does not support entrypoint kind \`${input.entrypointKind}\` for interaction \`${input.interactionId}\`.`,
	path: `viewRenderIR.nodes.${input.nodeId}.interactions.${input.interactionId}.entrypointKind`,
	details: {
		adapterId: input.adapterId,
		reason: "unsupported_entrypoint_kind",
		nodeId: input.nodeId,
		nodeType: input.nodeType,
		interactionId: input.interactionId,
		entrypointKind: input.entrypointKind,
	},
});

const collectNodeDiagnostics = (input: {
	readonly capabilities: RendererAdapterCapabilityProfile;
	readonly node: CompiledViewRenderNode;
	readonly nodeId: string;
}): readonly RenderAdapterCompatibilityDiagnostic[] => {
	const diagnostics: RenderAdapterCompatibilityDiagnostic[] = [];

	if (!hasSupportedNodeType(input.capabilities, input.node.type)) {
		diagnostics.push(
			unsupportedNodeTypeDiagnostic({
				adapterId: input.capabilities.adapterId,
				nodeId: input.nodeId,
				nodeType: input.node.type,
			}),
		);
	}

	for (const interactionId of sortLexical(
		Object.keys(input.node.interactions),
	)) {
		const interaction = input.node.interactions[interactionId];
		if (interaction === undefined) {
			continue;
		}
		if (
			!hasSupportedInteraction(
				input.capabilities,
				input.node.type,
				interactionId,
			)
		) {
			diagnostics.push(
				unsupportedInteractionDiagnostic({
					adapterId: input.capabilities.adapterId,
					nodeId: input.nodeId,
					nodeType: input.node.type,
					interactionId,
				}),
			);
		}
		if (
			!hasSupportedEntrypointKind(
				input.capabilities,
				interaction.entrypointKind,
			)
		) {
			diagnostics.push(
				unsupportedEntrypointKindDiagnostic({
					adapterId: input.capabilities.adapterId,
					nodeId: input.nodeId,
					nodeType: input.node.type,
					interactionId,
					entrypointKind: interaction.entrypointKind,
				}),
			);
		}
	}

	return diagnostics;
};

/**
 * Evaluates canonical render IR against declared renderer adapter capabilities.
 */
export const validateRendererAdapterCompatibility = (
	input: ValidateRendererAdapterCompatibilityInput,
): RenderAdapterCompatibilityResult => {
	const diagnostics: RenderAdapterCompatibilityDiagnostic[] = [];

	for (const nodeId of input.viewRenderIR.nodeOrder) {
		const node = input.viewRenderIR.nodes[nodeId];
		if (node === undefined) {
			continue;
		}
		diagnostics.push(
			...collectNodeDiagnostics({
				capabilities: input.capabilities,
				node,
				nodeId,
			}),
		);
	}

	return {
		ok: diagnostics.length === 0,
		diagnostics,
	};
};
