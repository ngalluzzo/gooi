import type {
	CanonicalSpecModel,
	CompileDiagnostic,
	CompiledDomainFlowPlan,
	CompiledDomainRuntimeIR,
} from "@gooi/app-spec-contracts/compiled";
import { asRecord, asString } from "./cross-links/shared";
import { parseValueSource } from "./domain-runtime-ir-shared";

const parseMutationInputBindings = (input: {
	readonly mutationId: string;
	readonly value: unknown;
	readonly diagnostics: CompileDiagnostic[];
}): Readonly<
	Record<
		string,
		CompiledDomainRuntimeIR["mutations"][string]["inputBindings"][string]
	>
> => {
	const bindingValues = asRecord(input.value) ?? {};
	const bindings: Record<
		string,
		CompiledDomainRuntimeIR["mutations"][string]["inputBindings"][string]
	> = {};
	for (const [fieldId, fieldValue] of Object.entries(bindingValues).sort(
		([left], [right]) => left.localeCompare(right),
	)) {
		const parsed = parseValueSource(
			fieldValue,
			`mutations.${input.mutationId}.run.input.${fieldId}`,
			input.diagnostics,
		);
		if (parsed !== undefined) {
			bindings[fieldId] = parsed;
		}
	}
	return bindings;
};

export const compileFlowPlans = (input: {
	readonly model: CanonicalSpecModel;
}): Record<string, CompiledDomainFlowPlan> => {
	const domainRecord = asRecord(input.model.sections.domain) ?? {};
	const authoredFlows = asRecord(domainRecord.flows) ?? {};
	const flows: Record<string, CompiledDomainFlowPlan> = {};
	for (const flowId of Object.keys(authoredFlows).sort((left, right) =>
		left.localeCompare(right),
	)) {
		flows[flowId] = { flowId };
	}
	return flows;
};

export const compileMutationPlans = (input: {
	readonly model: CanonicalSpecModel;
	readonly diagnostics: CompileDiagnostic[];
}): Record<string, CompiledDomainRuntimeIR["mutations"][string]> => {
	const mutations: Record<
		string,
		CompiledDomainRuntimeIR["mutations"][string]
	> = {};
	for (let index = 0; index < input.model.mutations.length; index += 1) {
		const mutation = input.model.mutations[index];
		if (mutation === undefined) {
			continue;
		}
		const mutationId = asString(mutation.id);
		const runRecord = asRecord(mutation.run);
		const actionId = asString(runRecord?.actionId);
		if (mutationId === undefined || actionId === undefined) {
			continue;
		}
		mutations[mutationId] = {
			entrypointId: mutationId,
			actionId,
			inputBindings: parseMutationInputBindings({
				mutationId,
				value: runRecord?.input,
				diagnostics: input.diagnostics,
			}),
		};
	}
	return mutations;
};

export const compileQueryPlans = (input: {
	readonly model: CanonicalSpecModel;
}): Record<string, CompiledDomainRuntimeIR["queries"][string]> => {
	const queries: Record<string, CompiledDomainRuntimeIR["queries"][string]> =
		{};
	for (let index = 0; index < input.model.queries.length; index += 1) {
		const query = input.model.queries[index];
		if (query === undefined) {
			continue;
		}
		const queryId = asString(query.id);
		if (queryId === undefined) {
			continue;
		}
		queries[queryId] = { queryId };
	}
	return queries;
};
