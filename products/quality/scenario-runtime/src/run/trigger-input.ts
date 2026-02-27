import type {
	CompiledPersonaDefinition,
	CompiledScenarioPlan,
	CompiledScenarioTriggerPlan,
	ScenarioGeneratedInputLockSnapshot,
} from "@gooi/scenario-contracts/plans/scenario-plan";
import type { generateTriggerInput } from "../persona/generate-trigger-input";

export const resolveTriggerInput = (input: {
	readonly scenario: CompiledScenarioPlan;
	readonly stepIndex: number;
	readonly trigger: CompiledScenarioTriggerPlan;
	readonly persona?: CompiledPersonaDefinition;
	readonly captures: Readonly<Record<string, unknown>>;
	readonly lockSnapshot: ScenarioGeneratedInputLockSnapshot;
	readonly refreshGenerated: boolean;
	readonly generateInput: typeof generateTriggerInput;
}):
	| {
			readonly ok: true;
			readonly input: Readonly<Record<string, unknown>>;
			readonly generatedInput?: Readonly<Record<string, unknown>>;
	  }
	| { readonly ok: false; readonly reason: "capture_missing" } => {
	const locked =
		input.lockSnapshot.generated[input.scenario.scenarioId]?.[input.stepIndex];
	const shouldGenerate = input.trigger.generate === true;

	let generated: Readonly<Record<string, unknown>> = {};
	if (shouldGenerate) {
		if (!input.refreshGenerated && locked !== undefined) {
			generated = locked;
		} else {
			generated = input.generateInput({
				scenario: input.scenario,
				stepIndex: input.stepIndex,
				...(input.persona === undefined ? {} : { persona: input.persona }),
			});
		}
	}

	const fromCapture: Record<string, unknown> = {};
	for (const [targetField, captureId] of Object.entries(
		input.trigger.inputFromCapture ?? {},
	)) {
		if (!Object.hasOwn(input.captures, captureId)) {
			return { ok: false, reason: "capture_missing" };
		}
		fromCapture[targetField] = input.captures[captureId];
	}

	return {
		ok: true,
		input: {
			...generated,
			...fromCapture,
			...(input.trigger.input ?? {}),
		},
		...(shouldGenerate ? { generatedInput: generated } : {}),
	};
};
