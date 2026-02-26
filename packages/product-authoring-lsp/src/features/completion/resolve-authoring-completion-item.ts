import { resolveCapability } from "@gooi/capability-index/resolve";

import {
	type AuthoringCompletionItem,
	authoringCompletionResolveRequestSchema,
	authoringCompletionResolveResultSchema,
} from "../../contracts/completion-contracts";
import { evaluateAuthoringReadParity } from "../../internal/lockfile-parity";

const withCapabilityMetadata = (input: {
	readonly item: AuthoringCompletionItem;
	readonly context: Parameters<typeof resolveCapability>[0];
}): AuthoringCompletionItem => {
	const capabilityId = input.item.data?.capabilityId;
	if (capabilityId === undefined) {
		return input.item;
	}

	const capability = resolveCapability(input.context, {
		capabilityId,
		...(input.item.data?.capabilityVersion === undefined
			? {}
			: { capabilityVersion: input.item.data.capabilityVersion }),
	});
	if (capability === undefined) {
		return input.item;
	}

	const detail = `${capability.capabilityVersion} (${capability.provenance})`;
	const documentation = [
		`effects: ${capability.declaredEffects.join(", ")}`,
		`input: ${capability.ioSchemaRefs.inputSchemaRef}`,
		`output: ${capability.ioSchemaRefs.outputSchemaRef}`,
		`error: ${capability.ioSchemaRefs.errorSchemaRef}`,
	]
		.filter((line) => line.length > 0)
		.join("\n");

	return {
		...input.item,
		detail,
		documentation,
		deprecated: capability.deprecation.isDeprecated,
	};
};

/**
 * Resolves one completion item with deferred metadata for `completionItem/resolve`.
 *
 * @param value - Untrusted completion resolve request.
 * @returns Completion resolve payload with parity state.
 *
 * @example
 * const resolved = resolveAuthoringCompletionItem({ context, item });
 */
export const resolveAuthoringCompletionItem = (value: unknown) => {
	const request = authoringCompletionResolveRequestSchema.parse(value);
	const parity = evaluateAuthoringReadParity(request.context);
	const item = withCapabilityMetadata({
		item: request.item,
		context: request.context.capabilityIndexSnapshot,
	});

	return authoringCompletionResolveResultSchema.parse({
		parity,
		item,
	});
};
