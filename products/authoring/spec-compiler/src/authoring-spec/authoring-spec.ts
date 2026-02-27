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
	/** App identity and global configuration (id, display name, timezone, history policy). */
	app: appSectionSchema,
	/** Business model declaration: collections, signals, capabilities, actions, flows, and projections. */
	domain: domainSectionSchema,
	/** User session schema and default values shared across all entrypoints. */
	session: sessionSectionSchema,
	/** View tree and screen definitions rendered by surface adapters. */
	views: viewsSectionSchema,
	/** Read entrypoint declarations. Each query surfaces a domain projection with typed input and access control. */
	queries: z.array(querySchema),
	/** Write entrypoint declarations. Each mutation delegates to a domain action with typed input and access control. */
	mutations: z.array(mutationSchema),
	/** Navigation entrypoint declarations. Each route maps a surface path to a view screen with optional typed parameters. */
	routes: z.array(routeSchema),
	/** Named customer archetypes used to seed scenario context and drive generated trigger synthesis. */
	personas: personasSectionSchema,
	/** Named behavioral test contracts composed of ordered trigger, expect, and capture steps. */
	scenarios: scenariosSectionSchema,
	/** Surface adapter bind maps and capability reachability requirements consumed by the deployment binding resolver. */
	wiring: wiringSectionSchema,
	/** Role model and default access policy governing entrypoint authorization. */
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
