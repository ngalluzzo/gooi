import type {
	CanonicalSpecModel,
	CompileDiagnostic,
} from "@gooi/app-spec-contracts/compiled";
import {
	type CompiledScenarioPlanSet,
	plansContracts,
} from "@gooi/scenario-contracts/plans";
import { sha256, stableStringify } from "@gooi/stable-json";
import { asRecord } from "./cross-links/shared";
import {
	compilePersonaPlans,
	compileScenarioPlans,
} from "./scenario-ir-plans-compiler";
import { sortRecord } from "./scenario-ir-shared";

interface CompileScenarioIROutput {
	readonly scenarioIR: CompiledScenarioPlanSet;
	readonly diagnostics: readonly CompileDiagnostic[];
}

/**
 * Compiles personas/scenarios into deterministic compiled scenario IR.
 */
export const compileScenarioIR = (input: {
	readonly model: CanonicalSpecModel;
}): CompileScenarioIROutput => {
	const diagnostics: CompileDiagnostic[] = [];
	const authoredPersonas = asRecord(input.model.sections.personas) ?? {};
	const authoredScenarios = asRecord(input.model.sections.scenarios) ?? {};
	const personas = compilePersonaPlans({
		authoredPersonas,
		diagnostics,
	});
	const scenarios = compileScenarioPlans({
		authoredScenarios,
		diagnostics,
	});

	const sectionHash = sha256(
		stableStringify({
			personas: input.model.sections.personas,
			scenarios: input.model.sections.scenarios,
		}),
	);
	const partialPlanSet: Omit<CompiledScenarioPlanSet, "artifactHash"> = {
		artifactVersion: plansContracts.compiledScenarioPlanSetVersion,
		sectionHash,
		personas: sortRecord(personas),
		scenarios: sortRecord(scenarios),
	};

	return {
		scenarioIR: {
			...partialPlanSet,
			artifactHash: sha256(stableStringify(partialPlanSet)),
		},
		diagnostics,
	};
};
