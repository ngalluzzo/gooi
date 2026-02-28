/**
 * Canonical boundary contract API.
 */
import * as fixtures from "./fixtures";

export type {
	ConformanceFixtureDescriptor,
	ConformanceLaneId,
} from "./fixtures";

export const fixturesContracts = Object.freeze({
	conformanceLaneIdSchema: fixtures.conformanceLaneIdSchema,
	conformanceFixtureDescriptorSchema:
		fixtures.conformanceFixtureDescriptorSchema,
	parseConformanceFixtureDescriptor: fixtures.parseConformanceFixtureDescriptor,
});
