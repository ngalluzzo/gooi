import { z } from "zod";
import { strictObjectWithExtensions } from "../schema-utils";

const semverSchema = z.string().regex(/^\d+\.\d+\.\d+$/, {
	message: "Expected semver in MAJOR.MINOR.PATCH format.",
});

const capabilitySchema = strictObjectWithExtensions({
	/** Semver version of the capability contract this app declares as a dependency. Must follow `MAJOR.MINOR.PATCH` format. Defaults to latest when omitted. */
	version: semverSchema.optional(),
	/** Optional typed input field map for authored domain capability logic. */
	in: z.record(z.string(), z.unknown()).optional(),
	/** Optional typed output field map for authored domain capability logic. */
	out: z.record(z.string(), z.unknown()).optional(),
	/** Optional ordered capability step list for authored capability execution. */
	do: z.array(z.unknown()).optional(),
	/** Optional capability return mapping for authored capability execution. */
	return: z.record(z.string(), z.unknown()).optional(),
});

/**
 * `domain` section authoring contract.
 */
export const domainSectionSchema = strictObjectWithExtensions({
	/** Optional map of named persistent data collections owned by this app. Key-value shape is deferred to the section compiler. */
	collections: z.record(z.string(), z.unknown()).optional(),
	/** Optional map of named domain signals that actions may emit. Signals drive flow dispatch and view refresh subscriptions. Key-value shape is deferred to the section compiler. */
	signals: z.record(z.string(), z.unknown()).optional(),
	/** Optional map of named external capability dependencies declared by this app, keyed by capability ID. Each entry declares the required port version. */
	capabilities: z.record(z.string(), capabilitySchema).optional(),
	/** Optional map of named domain actions, each defining an ordered step graph for a write operation. Actions are not publicly reachable until surfaced by a mutation. Key-value shape is deferred to the section compiler. */
	actions: z.record(z.string(), z.unknown()).optional(),
	/** Optional map of named signal-driven orchestration flows. Flows react to emitted signals and execute sequentially across correlation scopes. Key-value shape is deferred to the section compiler. */
	flows: z.record(z.string(), z.unknown()).optional(),
	/** Optional map of named read projections over collections. Projections are not publicly reachable until surfaced by a query. Key-value shape is deferred to the section compiler. */
	projections: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Parsed `domain` section type.
 */
export type DomainSection = z.infer<typeof domainSectionSchema>;
