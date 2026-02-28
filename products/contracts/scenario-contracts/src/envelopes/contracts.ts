/**
 * Canonical boundary contract API.
 */
import * as scenario_envelopes from "./scenario-envelopes";

export type {
	ScenarioRunEnvelope,
	ScenarioStepResultEnvelope,
} from "./scenario-envelopes";

export const envelopesContracts = Object.freeze({
	scenarioRunEnvelopeVersion: scenario_envelopes.scenarioRunEnvelopeVersion,
});
