import { z } from "zod";
import { strictObjectWithExtensions } from "./schema-utils";
import { accessSectionSchema } from "./sections/access-section";
import { appSectionSchema } from "./sections/app-section";
import { domainSectionSchema } from "./sections/domain-section";
import {
	mutationSchema,
	querySchema,
	routeSchema,
} from "./sections/entrypoints-section";
import {
	personasSectionSchema,
	scenariosSectionSchema,
} from "./sections/persona-scenario-section";
import { sessionSectionSchema } from "./sections/session-section";
import { viewsSectionSchema } from "./sections/views-section";
import { wiringSectionSchema } from "./sections/wiring-section";

/**
 * Canonical full app spec contract version.
 */
export const gooiAppSpecVersionSchema = z.literal("1.0.0");

/**
 * Canonical full app spec contract compatibility policy.
 */
export const gooiAppSpecCompatibilityPolicy = Object.freeze({
	additive: "non_breaking_optional_fields",
	breaking: "major_version_bump_required",
});

/**
 * Full authoring app spec contract accepted by the canonical compiler.
 */
export const gooiAppSpecSchema = strictObjectWithExtensions({
	app: appSectionSchema,
	domain: domainSectionSchema,
	session: sessionSectionSchema,
	views: viewsSectionSchema,
	queries: z.array(querySchema),
	mutations: z.array(mutationSchema),
	routes: z.array(routeSchema),
	personas: personasSectionSchema,
	scenarios: scenariosSectionSchema,
	wiring: wiringSectionSchema,
	access: accessSectionSchema,
});

/**
 * Parsed full app spec type used by compilation helpers.
 */
export type GooiAppSpec = z.infer<typeof gooiAppSpecSchema>;

/**
 * Backward-compatible alias retained for existing compile pipeline imports.
 */
export const authoringEntrypointSpecSchema = gooiAppSpecSchema;

/**
 * Backward-compatible alias retained for existing compile pipeline imports.
 */
export type AuthoringEntrypointSpec = GooiAppSpec;

/**
 * Parses and validates full app spec input.
 *
 * @param value - Untrusted authoring spec input.
 * @returns Parsed app spec.
 */
export const parseGooiAppSpec = (value: unknown): GooiAppSpec =>
	gooiAppSpecSchema.parse(value);

/**
 * Parses and validates authoring spec input.
 *
 * @param value - Untrusted authoring spec input.
 * @returns Parsed app spec.
 */
export const parseAuthoringEntrypointSpec = (
	value: unknown,
): AuthoringEntrypointSpec => parseGooiAppSpec(value);
