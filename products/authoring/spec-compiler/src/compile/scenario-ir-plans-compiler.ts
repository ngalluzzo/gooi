import type { CompileDiagnostic } from "@gooi/app-spec-contracts/compiled";
import type { CompiledScenarioPlanSet } from "@gooi/scenario-contracts/plans";
import { asRecord, asString } from "./cross-links/shared";
import { scenarioIRError, sortRecord } from "./scenario-ir-shared";
import { compileScenarioSteps } from "./scenario-ir-step-compiler";

export const compilePersonaPlans = (input: {
	readonly authoredPersonas: Readonly<Record<string, unknown>>;
	readonly diagnostics: CompileDiagnostic[];
}): Record<string, CompiledScenarioPlanSet["personas"][string]> => {
	const personas: Record<string, CompiledScenarioPlanSet["personas"][string]> =
		{};
	for (const personaId of Object.keys(input.authoredPersonas).sort(
		(left, right) => left.localeCompare(right),
	)) {
		const persona = asRecord(input.authoredPersonas[personaId]) ?? {};
		const tags = Array.isArray(persona.tags)
			? [
					...new Set(
						persona.tags.filter(
							(tag): tag is string => typeof tag === "string",
						),
					),
				]
			: [];
		const description = asString(persona.description);
		if (description === undefined || description.length === 0) {
			input.diagnostics.push(
				scenarioIRError(
					`personas.${personaId}.description`,
					"Persona requires a non-empty description.",
				),
			);
		}
		personas[personaId] = {
			personaId,
			description: description ?? "",
			traits: sortRecord(asRecord(persona.traits) ?? {}),
			history: Array.isArray(persona.history) ? persona.history : [],
			tags: tags.sort((left, right) => left.localeCompare(right)),
		};
	}
	return personas;
};

export const compileScenarioPlans = (input: {
	readonly authoredScenarios: Readonly<Record<string, unknown>>;
	readonly diagnostics: CompileDiagnostic[];
}): Record<string, CompiledScenarioPlanSet["scenarios"][string]> => {
	const scenarios: Record<
		string,
		CompiledScenarioPlanSet["scenarios"][string]
	> = {};
	for (const scenarioId of Object.keys(input.authoredScenarios).sort(
		(left, right) => left.localeCompare(right),
	)) {
		const scenario = asRecord(input.authoredScenarios[scenarioId]) ?? {};
		const context = asRecord(scenario.context) ?? {};
		const authoredSteps = Array.isArray(scenario.steps) ? scenario.steps : [];
		const compiledSteps = compileScenarioSteps({
			scenarioId,
			authoredSteps,
			diagnostics: input.diagnostics,
		});

		const tags = Array.isArray(scenario.tags)
			? [
					...new Set(
						scenario.tags.filter(
							(tag): tag is string => typeof tag === "string",
						),
					),
				]
			: [];
		const personaId = asString(context.persona);
		const principal = asRecord(context.principal);
		const session = asRecord(context.session);
		const providerOverrides = asRecord(context.providerOverrides);
		scenarios[scenarioId] = {
			scenarioId,
			tags: tags.sort((left, right) => left.localeCompare(right)),
			context: {
				...(personaId === undefined ? {} : { personaId }),
				...(principal === undefined
					? {}
					: { principal: sortRecord(principal) }),
				...(session === undefined ? {} : { session: sortRecord(session) }),
				...(providerOverrides === undefined
					? {}
					: { providerOverrides: sortRecord(providerOverrides) }),
			},
			steps: compiledSteps,
		};
	}
	return scenarios;
};
