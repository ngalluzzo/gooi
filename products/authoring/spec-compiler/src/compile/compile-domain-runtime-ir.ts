import {
	type CanonicalSpecModel,
	type CompileDiagnostic,
	type CompiledDomainActionPlan,
	type CompiledDomainRuntimeIR,
	compiledContracts,
} from "@gooi/app-spec-contracts/compiled";
import { asRecord } from "./cross-links/shared";
import { parseActionPlan } from "./domain-runtime-ir-actions";
import {
	compileFlowPlans,
	compileMutationPlans,
	compileQueryPlans,
} from "./domain-runtime-ir-entrypoint-plans";
import { sortRecord } from "./domain-runtime-ir-shared";

interface CompileDomainRuntimeIROutput {
	readonly domainRuntimeIR: CompiledDomainRuntimeIR;
	readonly diagnostics: readonly CompileDiagnostic[];
}

/**
 * Compiles domain actions/flows and entrypoint mappings into runtime IR.
 */
export const compileDomainRuntimeIR = (input: {
	readonly model: CanonicalSpecModel;
}): CompileDomainRuntimeIROutput => {
	const diagnostics: CompileDiagnostic[] = [];
	const domainRecord = asRecord(input.model.sections.domain) ?? {};
	const authoredActions = asRecord(domainRecord.actions) ?? {};

	const actions: Record<string, CompiledDomainActionPlan> = {};
	for (const actionId of Object.keys(authoredActions).sort((left, right) =>
		left.localeCompare(right),
	)) {
		actions[actionId] = parseActionPlan({
			actionId,
			value: authoredActions[actionId],
			diagnostics,
		});
	}

	const flows = compileFlowPlans({ model: input.model });
	const mutations = compileMutationPlans({
		model: input.model,
		diagnostics,
	});
	const queries = compileQueryPlans({
		model: input.model,
	});

	return {
		domainRuntimeIR: {
			artifactVersion: compiledContracts.compiledDomainRuntimeIRVersion,
			actions: sortRecord(actions),
			mutations: sortRecord(mutations),
			queries: sortRecord(queries),
			flows: sortRecord(flows),
		},
		diagnostics,
	};
};
