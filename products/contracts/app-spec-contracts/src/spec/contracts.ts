/**
 * Canonical boundary contract API.
 */
import * as schema_utils from "./schema-utils";
import * as access_section from "./sections/access-section";
import * as app_section from "./sections/app-section";
import * as domain_section from "./sections/domain-section";
import * as entrypoints_section from "./sections/entrypoints-section";
import * as persona_scenario_section from "./sections/persona-scenario-section";
import * as session_section from "./sections/session-section";
import * as views_section from "./sections/views-section";
import * as wiring_section from "./sections/wiring-section";
import * as spec from "./spec";

export type { AccessSection } from "./sections/access-section";
export type { AppSection } from "./sections/app-section";
export type { DomainSection } from "./sections/domain-section";
export type { SessionSection } from "./sections/session-section";
export type { ViewsSection } from "./sections/views-section";
export type { WiringSection } from "./sections/wiring-section";
export type { AuthoringEntrypointSpec, GooiAppSpec } from "./spec";

export const specContracts = Object.freeze({
	strictObjectWithExtensions: schema_utils.strictObjectWithExtensions,
	accessSectionSchema: access_section.accessSectionSchema,
	appSectionSchema: app_section.appSectionSchema,
	domainSectionSchema: domain_section.domainSectionSchema,
	querySchema: entrypoints_section.querySchema,
	mutationSchema: entrypoints_section.mutationSchema,
	routeSchema: entrypoints_section.routeSchema,
	personasSectionSchema: persona_scenario_section.personasSectionSchema,
	scenariosSectionSchema: persona_scenario_section.scenariosSectionSchema,
	sessionSectionSchema: session_section.sessionSectionSchema,
	viewsSectionSchema: views_section.viewsSectionSchema,
	reachabilityRequirementSchema: wiring_section.reachabilityRequirementSchema,
	wiringSectionSchema: wiring_section.wiringSectionSchema,
	gooiAppSpecVersionSchema: spec.gooiAppSpecVersionSchema,
	gooiAppSpecCompatibilityPolicy: spec.gooiAppSpecCompatibilityPolicy,
	gooiAppSpecSchema: spec.gooiAppSpecSchema,
	authoringEntrypointSpecSchema: spec.authoringEntrypointSpecSchema,
	parseGooiAppSpec: spec.parseGooiAppSpec,
	parseAuthoringEntrypointSpec: spec.parseAuthoringEntrypointSpec,
});
