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
	readonly details?: Readonly<Record<string, unknown>>;
}

export const createScenarioError = (
	code: ScenarioErrorCode,
	message: string,
	scenarioId: string,
	stepIndex: number,
	details?: Readonly<Record<string, unknown>>,
): ScenarioTypedError => ({
	code,
	message,
	scenarioId,
	stepIndex,
	...(details === undefined ? {} : { details }),
});
