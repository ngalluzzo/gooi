import { z } from "zod";
import { strictObjectWithExtensions } from "../schema-utils";

/**
 * `session` section authoring contract.
 */
export const sessionSectionSchema = strictObjectWithExtensions({
	fields: z.record(z.string(), z.unknown()),
	defaults: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Parsed `session` section type.
 */
export type SessionSection = z.infer<typeof sessionSectionSchema>;
