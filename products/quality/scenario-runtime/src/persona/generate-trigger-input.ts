import type {
	CompiledPersonaDefinition,
	CompiledScenarioPlan,
} from "@gooi/scenario-contracts/plans/scenario-plan";
import { sha256, stableStringify } from "@gooi/stable-json";

export interface GenerateTriggerInput {
	readonly scenario: CompiledScenarioPlan;
	readonly stepIndex: number;
	readonly persona?: CompiledPersonaDefinition;
}

export const generateTriggerInput = (
	input: GenerateTriggerInput,
): Readonly<Record<string, unknown>> => {
	const digest = sha256(
		stableStringify({
			scenarioId: input.scenario.scenarioId,
			stepIndex: input.stepIndex,
			personaId: input.persona?.personaId,
			traits: input.persona?.traits ?? {},
			history: input.persona?.history ?? [],
		}),
	);
	const seed = digest.slice(0, 8);
	return {
		message: `generated:${input.persona?.personaId ?? "default"}:${seed}`,
	};
};
