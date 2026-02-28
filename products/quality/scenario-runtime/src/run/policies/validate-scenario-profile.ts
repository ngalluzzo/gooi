import type { GuardRuntimeEnvironment } from "@gooi/guard-contracts/plans";
import {
	errorsContracts,
	type ScenarioTypedError,
} from "@gooi/scenario-contracts/errors";
import type { CompiledScenarioPlan } from "@gooi/scenario-contracts/plans";
import {
	defaultScenarioExecutionProfile,
	type ScenarioExecutionProfile,
} from "../contracts";

export const resolveScenarioProfile = (
	profile: ScenarioExecutionProfile | undefined,
): ScenarioExecutionProfile => profile ?? defaultScenarioExecutionProfile;

export const profileToGuardEnvironment = (
	profile: ScenarioExecutionProfile,
): GuardRuntimeEnvironment => {
	switch (profile) {
		case "simulation":
			return "simulation";
		case "pre_merge":
		case "default_ci":
			return "ci";
		case "production_smoke":
			return "production";
	}
};

const findGeneratedTriggerStep = (scenario: CompiledScenarioPlan): number =>
	scenario.steps.findIndex(
		(step) => step.kind === "trigger" && step.trigger.generate === true,
	);

export const validateScenarioProfile = (input: {
	readonly scenario: CompiledScenarioPlan;
	readonly profile?: ScenarioExecutionProfile;
}):
	| { readonly ok: true; readonly profile: ScenarioExecutionProfile }
	| { readonly ok: false; readonly error: ScenarioTypedError } => {
	const profile = resolveScenarioProfile(input.profile);
	const generatedStepIndex = findGeneratedTriggerStep(input.scenario);
	if (generatedStepIndex !== -1) {
		const allowsGenerated = profile === "simulation" || profile === "pre_merge";
		if (!allowsGenerated) {
			return {
				ok: false,
				error: errorsContracts.createScenarioError(
					"scenario_policy_error",
					"Generated triggers are allowed only in simulation and pre-merge profiles.",
					input.scenario.scenarioId,
					generatedStepIndex,
					{ profile, policy: "generated_trigger_profile_gate" },
				),
			};
		}
	}

	if (
		profile === "default_ci" &&
		input.scenario.context.providerOverrides !== undefined
	) {
		return {
			ok: false,
			error: errorsContracts.createScenarioError(
				"scenario_policy_error",
				"Provider overrides are not allowed in default CI profile runs.",
				input.scenario.scenarioId,
				0,
				{ profile, policy: "provider_override_default_ci_gate" },
			),
		};
	}

	return { ok: true, profile };
};
