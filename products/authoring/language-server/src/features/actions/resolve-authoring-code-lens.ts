import {
	type AuthoringCodeLens,
	authoringCodeLensResolveRequestSchema,
	authoringCodeLensResolveResultSchema,
} from "../../contracts/code-lens-contracts";
import { evaluateAuthoringReadParity } from "../../internal/lockfile-parity";

const withRunCommand = (input: {
	readonly lens: AuthoringCodeLens;
	readonly parityStatus: "matched" | "mismatch";
	readonly symbolName: string;
	readonly parityIssueCount: number;
}): AuthoringCodeLens => {
	if (input.parityStatus === "mismatch") {
		return {
			...input.lens,
			command: {
				id: "gooi.authoring.lockfileMismatch",
				title: `Runtime action blocked by lockfile mismatch (${input.parityIssueCount}).`,
				arguments: [{ symbolId: input.lens.symbolId }],
			},
		};
	}
	return {
		...input.lens,
		command: {
			id: "gooi.authoring.runEntrypoint",
			title: `Run ${input.symbolName}`,
			arguments: [{ symbolId: input.lens.symbolId }],
		},
	};
};

/**
 * Resolves one code lens into executable command metadata.
 *
 * @param value - Untrusted code-lens resolve request.
 * @returns Resolved code lens with parity state.
 *
 * @example
 * const resolved = resolveAuthoringCodeLens({ context, lens });
 */
export const resolveAuthoringCodeLens = (value: unknown) => {
	const request = authoringCodeLensResolveRequestSchema.parse(value);
	const parity = evaluateAuthoringReadParity(request.context);
	const symbol = request.context.symbolGraphSnapshot.symbols.find(
		(candidate) => candidate.id === request.lens.symbolId,
	);
	const symbolName = symbol?.name ?? request.lens.symbolId;

	if (request.lens.kind === "run_query_or_mutation") {
		return authoringCodeLensResolveResultSchema.parse({
			parity,
			lens: withRunCommand({
				lens: request.lens,
				parityStatus: parity.status,
				symbolName,
				parityIssueCount: parity.issues.length,
			}),
		});
	}

	if (request.lens.kind === "show_providers_for_capability") {
		const capabilityId =
			typeof request.lens.data?.capabilityId === "string"
				? request.lens.data.capabilityId
				: symbolName;
		const capability =
			request.context.capabilityIndexSnapshot.capabilities.find(
				(entry) => entry.capabilityId === capabilityId,
			);
		const providerCount = capability?.providerAvailability.length ?? 0;
		return authoringCodeLensResolveResultSchema.parse({
			parity,
			lens: {
				...request.lens,
				command: {
					id: "gooi.authoring.showProviders",
					title: `Show providers (${providerCount})`,
					arguments: [{ capabilityId }],
				},
			},
		});
	}

	const queryIds = request.context.symbolGraphSnapshot.references
		.filter(
			(edge) =>
				edge.relationship === "refresh_subscription" &&
				edge.fromSymbolId === request.lens.symbolId,
		)
		.map((edge) => edge.toSymbolId)
		.sort();

	return authoringCodeLensResolveResultSchema.parse({
		parity,
		lens: {
			...request.lens,
			command: {
				id: "gooi.authoring.showAffectedQueries",
				title: `Show affected queries (${queryIds.length})`,
				arguments: [
					{ signalSymbolId: request.lens.symbolId, querySymbolIds: queryIds },
				],
			},
		},
	});
};
