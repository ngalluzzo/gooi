import type {
	CompiledDomainActionPlan,
	CompiledDomainRuntimeIR,
	CompiledSessionIR,
} from "@gooi/app-spec-contracts/compiled";

export const createSessionIRFixture = (
	overrides?: Partial<CompiledSessionIR>,
): CompiledSessionIR => ({
	artifactVersion: "1.0.0",
	fields: {},
	defaults: {},
	...overrides,
});

export const createDomainRuntimeIRFixture = (input: {
	readonly mutationEntrypointActionMap: Readonly<Record<string, string>>;
	readonly actions: Readonly<Record<string, CompiledDomainActionPlan>>;
	readonly queries?: readonly string[];
}): CompiledDomainRuntimeIR => {
	const mutations = Object.fromEntries(
		Object.entries(input.mutationEntrypointActionMap).map(
			([entrypointId, actionId]) => [
				entrypointId,
				{
					entrypointId,
					actionId,
					inputBindings: {},
				},
			],
		),
	);
	const queries = Object.fromEntries(
		(input.queries ?? []).map((queryId) => [queryId, { queryId }]),
	);
	const flowIds = new Set<string>();
	for (const action of Object.values(input.actions)) {
		for (const flowGuard of action.flowGuards ?? []) {
			flowIds.add(flowGuard.flowId);
		}
	}
	const flows = Object.fromEntries(
		[...flowIds]
			.sort((left, right) => left.localeCompare(right))
			.map((flowId) => [flowId, { flowId }]),
	);
	return {
		artifactVersion: "1.0.0",
		actions: input.actions,
		mutations,
		queries,
		flows,
	};
};
