import type { ScenarioStepResultEnvelope } from "@gooi/scenario-contracts/envelopes";
import { envelopesContracts } from "@gooi/scenario-contracts/envelopes";
import type { ScenarioTypedError } from "@gooi/scenario-contracts/errors";
import type { CompiledScenarioStep } from "@gooi/scenario-contracts/plans";

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
	envelopeVersion: envelopesContracts.scenarioRunEnvelopeVersion,
	scenarioId: input.scenarioId,
	stepIndex: input.stepIndex,
	step: input.step,
	ok: input.ok,
	traceId: input.traceId,
	invocationId: input.invocationId,
	captures: input.captures,
	...(input.error === undefined ? {} : { error: input.error }),
});
