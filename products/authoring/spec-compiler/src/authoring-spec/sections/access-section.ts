import { z } from "zod";
import { strictObjectWithExtensions } from "../schema-utils";

const roleSchema = strictObjectWithExtensions({
	description: z.string().optional(),
	extends: z.array(z.string().min(1)).optional(),
	derive: z.record(z.string(), z.unknown()).optional(),
});

/**
 * `access` section authoring contract.
 */
export const accessSectionSchema = strictObjectWithExtensions({
	default_policy: z.enum(["allow", "deny"]),
	roles: z.record(z.string(), roleSchema),
});

/**
 * Parsed `access` section type.
 */
export type AccessSection = z.infer<typeof accessSectionSchema>;
