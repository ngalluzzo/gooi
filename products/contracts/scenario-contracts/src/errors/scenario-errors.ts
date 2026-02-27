import type { JsonObject } from "@gooi/contract-primitives/json";
import { z } from "zod";

export const scenarioErrorCodeSchema = z.enum([
	"scenario_trigger_error",
	"scenario_expectation_error",
	"scenario_guard_error",
	"scenario_capture_error",
	"scenario_generation_error",
	"scenario_lockfile_error",
	"scenario_policy_error",
]);

export type ScenarioErrorCode = z.infer<typeof scenarioErrorCodeSchema>;

export interface ScenarioTypedError {
	readonly code: ScenarioErrorCode;
	readonly message: string;
	readonly scenarioId: string;
	readonly stepIndex: number;
	readonly details?: JsonObject;
}

export const createScenarioError = (
	code: ScenarioErrorCode,
	message: string,
	scenarioId: string,
	stepIndex: number,
	details?: JsonObject,
): ScenarioTypedError => ({
	code,
	message,
	scenarioId,
	stepIndex,
	...(details === undefined ? {} : { details }),
});
