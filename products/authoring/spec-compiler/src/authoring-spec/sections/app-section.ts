import { z } from "zod";
import { strictObjectWithExtensions } from "../schema-utils";

/**
 * `app` section authoring contract.
 */
export const appSectionSchema = strictObjectWithExtensions({
	/** Stable identifier for this app, used as the canonical key across compiled artifacts and runtime logs. Must be non-empty. */
	id: z.string().min(1),
	/** Human-readable display name shown in authoring surfaces and diagnostics. Must be non-empty. */
	name: z.string().min(1),
	/** IANA timezone identifier applied to all time-sensitive operations in this app (e.g., `UTC`, `America/New_York`). Must be non-empty. */
	tz: z.string().min(1),
	/** Optional event-sourcing history policy configuration for this app. Key-value shape is deferred to the section compiler. */
	history: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Parsed `app` section type.
 */
export type AppSection = z.infer<typeof appSectionSchema>;
