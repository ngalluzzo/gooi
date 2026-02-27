import type { JsonObject } from "@gooi/contract-primitives/json";
import type { ScenarioTypedError } from "../errors/scenario-errors";
import type {
	CompiledScenarioStep,
	ScenarioGeneratedInputLockSnapshot,
} from "../plans/scenario-plan";

export const scenarioRunEnvelopeVersion = "1.0.0" as const;

export interface ScenarioStepResultEnvelope {
	readonly envelopeVersion: typeof scenarioRunEnvelopeVersion;
	readonly scenarioId: string;
	readonly stepIndex: number;
	readonly step: CompiledScenarioStep;
	readonly ok: boolean;
	readonly traceId: string;
	readonly invocationId: string;
	readonly captures: JsonObject;
	readonly error?: ScenarioTypedError;
}

export interface ScenarioRunEnvelope {
	readonly envelopeVersion: typeof scenarioRunEnvelopeVersion;
	readonly scenarioId: string;
	readonly ok: boolean;
	readonly stepResults: readonly ScenarioStepResultEnvelope[];
	readonly captures: JsonObject;
	readonly lockSnapshot: ScenarioGeneratedInputLockSnapshot;
	readonly error?: ScenarioTypedError;
}
