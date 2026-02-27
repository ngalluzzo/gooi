import type { ScenarioStepResultEnvelope } from "@gooi/scenario-contracts/envelopes/scenario-envelopes";
import { scenarioRunEnvelopeVersion } from "@gooi/scenario-contracts/envelopes/scenario-envelopes";
import type { ScenarioTypedError } from "@gooi/scenario-contracts/errors/scenario-errors";
import type { CompiledScenarioStep } from "@gooi/scenario-contracts/plans/scenario-plan";

export const makeStepResult = (input: {
	readonly scenarioId: string;
	readonly stepIndex: number;
	readonly step: CompiledScenarioStep;
	readonly traceId: string;
	readonly invocationId: string;
	readonly captures: Readonly<Record<string, unknown>>;
	readonly ok: boolean;
	readonly error?: ScenarioTypedError;
}): ScenarioStepResultEnvelope => ({
	envelopeVersion: scenarioRunEnvelopeVersion,
	scenarioId: input.scenarioId,
	stepIndex: input.stepIndex,
	step: input.step,
	ok: input.ok,
	traceId: input.traceId,
	invocationId: input.invocationId,
	captures: input.captures,
	...(input.error === undefined ? {} : { error: input.error }),
});
