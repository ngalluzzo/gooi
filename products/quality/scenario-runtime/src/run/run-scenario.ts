import type { ScenarioRunEnvelope } from "@gooi/scenario-contracts/envelopes";
import { envelopesContracts } from "@gooi/scenario-contracts/envelopes";
import type { CompiledPersonaDefinition } from "@gooi/scenario-contracts/plans";
import { generateTriggerInput } from "../persona/generate-trigger-input";
import {
	emptyLockSnapshot,
	type MutableScenarioGeneratedInputLockSnapshot,
	type RunScenarioInput,
	type RuntimeState,
} from "./contracts";
import {
	profileToGuardEnvironment,
	validateScenarioProfile,
} from "./policies/validate-scenario-profile";
import { executeCaptureStep } from "./steps/execute-capture-step";
import { executeExpectStep } from "./steps/execute-expect-step";
import { executeTriggerStep } from "./steps/execute-trigger-step";

const resolvePersona = (
	input: RunScenarioInput,
): CompiledPersonaDefinition | undefined => {
	const personaId = input.scenario.context.personaId;
	if (personaId === undefined) {
		return undefined;
	}
	return input.personas[personaId];
};

/**
 * Runs one compiled scenario with deterministic trigger/expect/capture semantics.
 */
export const runScenario = async (
	input: RunScenarioInput,
): Promise<ScenarioRunEnvelope> => {
	const persona = resolvePersona(input);
	const lockBase = input.lockSnapshot ?? emptyLockSnapshot;
	const policy = validateScenarioProfile({
		scenario: input.scenario,
		...(input.profile === undefined ? {} : { profile: input.profile }),
	});
	if (!policy.ok) {
		return {
			envelopeVersion: envelopesContracts.scenarioRunEnvelopeVersion,
			scenarioId: input.scenario.scenarioId,
			ok: false,
			stepResults: [],
			captures: {},
			lockSnapshot: lockBase,
			error: policy.error,
		};
	}
	const lockDraft = {
		generated: {
			...lockBase.generated,
		},
	} satisfies MutableScenarioGeneratedInputLockSnapshot;
	const resolvedEnvironment =
		input.environment ?? profileToGuardEnvironment(policy.profile);
	const runtimeInput: RunScenarioInput = {
		...input,
		profile: policy.profile,
		environment: resolvedEnvironment,
		generateInput: input.generateInput ?? generateTriggerInput,
	};
	const state: RuntimeState = {
		captures: {},
		emittedSignals: [],
	};
	const stepResults: Array<ScenarioRunEnvelope["stepResults"][number]> = [];

	for (const [stepIndex, step] of input.scenario.steps.entries()) {
		const result =
			step.kind === "trigger"
				? await executeTriggerStep({
						runInput: runtimeInput,
						scenario: input.scenario,
						stepIndex,
						state,
						...(persona === undefined ? {} : { persona }),
						lockBase,
						lockDraft,
						refreshGenerated: input.refreshGenerated === true,
					})
				: step.kind === "expect"
					? await executeExpectStep({
							runInput: runtimeInput,
							scenario: input.scenario,
							stepIndex,
							state,
							...(persona === undefined ? {} : { persona }),
						})
					: executeCaptureStep({
							runInput: runtimeInput,
							scenario: input.scenario,
							stepIndex,
							state,
						});

		stepResults.push(result.stepResult);
		if (!result.ok) {
			return {
				envelopeVersion: envelopesContracts.scenarioRunEnvelopeVersion,
				scenarioId: input.scenario.scenarioId,
				ok: false,
				stepResults,
				captures: state.captures,
				lockSnapshot: lockBase,
				error: result.error,
			};
		}
	}

	return {
		envelopeVersion: envelopesContracts.scenarioRunEnvelopeVersion,
		scenarioId: input.scenario.scenarioId,
		ok: true,
		stepResults,
		captures: state.captures,
		lockSnapshot: lockDraft,
	};
};
