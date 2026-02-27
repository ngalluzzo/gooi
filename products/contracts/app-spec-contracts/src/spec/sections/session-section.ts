import { z } from "zod";
import { strictObjectWithExtensions } from "../schema-utils";

/**
 * `session` section authoring contract.
 */
export const sessionSectionSchema = strictObjectWithExtensions({
	/** Named session field definitions keyed by field name. Values declare typed field contracts; shape is deferred to the section compiler. */
	fields: z.record(z.string(), z.unknown()),
	/** Optional default values applied to session fields before the first mutation executes for a given session. Explicit caller values take precedence over defaults. */
	defaults: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Parsed `session` section type.
 */
export type SessionSection = z.infer<typeof sessionSectionSchema>;
