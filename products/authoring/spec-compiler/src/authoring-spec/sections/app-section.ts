import { z } from "zod";
import { strictObjectWithExtensions } from "../schema-utils";

/**
 * `app` section authoring contract.
 */
export const appSectionSchema = strictObjectWithExtensions({
	id: z.string().min(1),
	name: z.string().min(1),
	tz: z.string().min(1),
	history: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Parsed `app` section type.
 */
export type AppSection = z.infer<typeof appSectionSchema>;
