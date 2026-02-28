/**
 * Canonical boundary contract API.
 */
import * as scenario_errors from "./scenario-errors";

export type { ScenarioErrorCode, ScenarioTypedError } from "./scenario-errors";

export const errorsContracts = Object.freeze({
	scenarioErrorCodeSchema: scenario_errors.scenarioErrorCodeSchema,
	createScenarioError: scenario_errors.createScenarioError,
});
